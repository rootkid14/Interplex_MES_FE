import json
from typing import List, Optional

from fastapi import APIRouter, Depends, status
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.services.raw_material_service import get_raw_material_history
from app.models.legacy.modelconfigs import DBModelConfig
from app.services.assy_packing_linkage_service import (
    LinkageValidationError,
    create_active_assy_packing_link,
    deactivate_links_for_packing,
    get_job_part_number,
    resolve_active_packing_wo,
    validate_assy_packing_candidate,
)


router = APIRouter()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


class LinkAliasPayload(BaseModel):
    PackingWO: int
    AliasWO: int
    CreatedBy: Optional[str] = None


class LogMaterialPayload(BaseModel):
    PackingWO: int
    Code: str
    QTY: float
    Type: str
    PartNumber: str


class LogBoxPayload(BaseModel):
    PackingWO: int
    BoxId: str
    BoxQty: int
    Items: List[str]
    IsSkipped: bool
    SkipReason: Optional[str] = ""


class CreateBoxPayload(BaseModel):
    PackingWO: int
    BoxId: str


class LogBoxItemPayload(BaseModel):
    PackingWO: int
    BoxId: str
    ItemCode: str


class FinishBoxPayload(BaseModel):
    PackingWO: int
    BoxId: str
    PN: str
    IsSkipped: bool = False
    SkipReason: Optional[str] = ""


class RemoveBoxItemPayload(BaseModel):
    PackingWO: int
    BoxId: str
    ItemCode: str


class DeleteOpenBoxPayload(BaseModel):
    PackingWO: int
    BoxId: str


class MarkDonePayload(BaseModel):
    PackingWO: int


def error_payload(
    error: LinkageValidationError,
):
    return {
        "success": False,
        "message": error.message,
        "data": {
            "Code": error.code,
            **error.data,
        },
    }


def _as_bool(value) -> bool:
    if isinstance(value, bool):
        return value
    return str(value or "").strip().lower() in {
        "1",
        "true",
        "yes",
        "y",
    }


def _load_box_rule(
    db: Session,
    model_no: str,
):
    model = str(model_no or "").strip()

    config = (
        db.query(DBModelConfig)
        .filter(DBModelConfig.model_no == model)
        .first()
    )

    if not config:
        raise ValueError(
            f"Model {model} chưa có ModelConfigs."
        )

    try:
        raw_config = json.loads(
            config.json_data or "{}"
        )
    except json.JSONDecodeError as error:
        raise ValueError(
            f"JsonData của Model {model} không hợp lệ."
        ) from error

    rules = (
        raw_config.get("jsonData")
        or raw_config.get("rules")
        or raw_config
    )

    box_rule = (
        rules.get("boxRule", {})
        if isinstance(rules, dict)
        else {}
    )

    if not isinstance(box_rule, dict):
        box_rule = {}

    target_qty = int(
        box_rule.get("boxQTY") or 0
    )

    if target_qty <= 0:
        raise ValueError(
            f"Model {model} chưa khai báo boxQTY hợp lệ."
        )

    return box_rule, target_qty


def _validate_box_code(
    box_id: str,
    box_rule: dict,
):
    code = str(box_id or "").strip()

    if not code:
        return "Mã Bao bì không được để trống."

    if _as_bool(box_rule.get("isWildcard")):
        required_length = int(
            box_rule.get("wildcardLength") or 0
        )

        if (
            required_length > 0
            and len(code) != required_length
        ):
            return (
                "Mã Bao bì sai độ dài! "
                f"Yêu cầu: {required_length} ký tự."
            )

        return None

    fixed_string = str(
        box_rule.get("fixedString") or ""
    ).strip()

    if (
        fixed_string
        and fixed_string.upper() not in code.upper()
    ):
        return "Mã Bao bì sai định dạng cố định!"

    return None


def _format_box_item(
    item_code,
    created_at,
):
    return {
        "code": str(item_code or "").strip(),
        "time": (
            created_at.strftime("%H:%M:%S")
            if created_at
            else ""
        ),
    }


@router.get(
    "/status/{packing_wo}",
    status_code=status.HTTP_200_OK,
)
def get_packing_master_status(
    packing_wo: int,
    db: Session = Depends(get_db),
):
    """
    Endpoint legacy. Mọi dữ liệu vẫn được canonicalize về Packing WO active.
    """
    try:
        canonical_wo = resolve_active_packing_wo(
            packing_wo,
            db,
        )

        alias_rows = db.execute(
            text("""
                SELECT
                    CAST(L.AssyWO AS varchar(50)) AS wo,
                    LTRIM(RTRIM(J.Model)) AS pn,
                    L.IsActive AS isActive,
                    L.LinkedTime AS linkedTime
                FROM dbo.AssyPackingLinkage L
                INNER JOIN dbo.IPTH_Tbl_Job_Master_SAP J
                    ON CAST(L.AssyWO AS varchar(50))
                     = CAST(J.JobNo AS varchar(50))
                WHERE L.PackingWO = :wo
                  AND L.IsActive = 1
                ORDER BY L.LinkedTime DESC
            """),
            {"wo": canonical_wo},
        ).mappings().all()

        aliases = [
            {
                "wo": row["wo"],
                "pn": row["pn"],
                "isActive": bool(
                    row["isActive"]
                ),
                "linkedTime": (
                    str(row["linkedTime"])
                    if row["linkedTime"]
                    else None
                ),
            }
            for row in alias_rows
        ]

        main_inputs = [
            dict(row)
            for row in db.execute(
                text("""
                    SELECT
                        LTRIM(RTRIM(BatchCode)) AS code,
                        LTRIM(RTRIM(PartNumber)) AS pn,
                        Qty AS qty,
                        CONVERT(varchar, CreatedAt, 108) AS time
                    FROM dbo.InputMainLog
                    WHERE WO = :wo
                    ORDER BY CreatedAt DESC
                """),
                {"wo": canonical_wo},
            ).mappings().all()
        ]

        raw_materials = get_raw_material_history(db, canonical_wo)

        boxes_raw = db.execute(
            text("""
                SELECT
                    LTRIM(RTRIM(Batch)) AS id,
                    QTY AS maxQty,
                    CAST(1 AS bit) AS isFinished,
                    CAST('' AS nvarchar(500)) AS skipReason
                FROM dbo.Batches_Master
                WHERE Born_by_WO = :wo
                ORDER BY Born_time DESC
            """),
            {"wo": canonical_wo},
        ).mappings().all()

        boxes = []

        for box_row in boxes_raw:
            box = dict(box_row)

            box["items"] = [
                dict(item)
                for item in db.execute(
                    text("""
                        SELECT
                            LTRIM(RTRIM(Product)) AS code,
                            CONVERT(varchar, Time, 108) AS time
                        FROM dbo.Box_Master
                        WHERE BoxID = :box_id
                          AND from_WO = :wo
                    """),
                    {
                        "box_id": box["id"],
                        "wo": canonical_wo,
                    },
                ).mappings().all()
            ]

            boxes.append(box)

        return {
            "success": True,
            "data": {
                "requestedWO": packing_wo,
                "canonicalWO": canonical_wo,
                "linkedAliases": aliases,
                "mainInputs": main_inputs,
                "rawMaterials": raw_materials,
                "boxes": boxes,
            },
        }

    except Exception as error:
        return {
            "success": False,
            "message": str(error),
        }


@router.get(
    "/check_alias/{alias_wo}",
    status_code=status.HTTP_200_OK,
)
def check_alias_wo_info(
    alias_wo: int,
    db: Session = Depends(get_db),
):
    """
    Endpoint tương thích cũ: chỉ trả PN từ SAP.
    Validation linkage đầy đủ nằm tại check_link_alias/link_alias.
    """
    part_number = get_job_part_number(
        db,
        alias_wo,
    )

    if not part_number:
        return {
            "success": False,
            "message": (
                "Không tìm thấy thông tin Lệnh sản xuất này!"
            ),
        }

    return {
        "success": True,
        "data": {
            "PartNumber": part_number,
            "AssyWO": alias_wo,
        },
    }


@router.post(
    "/check_link_alias",
    status_code=status.HTTP_200_OK,
)
def check_link_alias(
    payload: LinkAliasPayload,
    db: Session = Depends(get_db),
):
    try:
        result = validate_assy_packing_candidate(
            db,
            assy_wo=int(payload.AliasWO),
            packing_wo=int(payload.PackingWO),
        )

        return {
            "success": True,
            "message": (
                "Assy WO đã được liên kết với Packing WO này."
                if result["AlreadyLinked"]
                else "Assy WO hợp lệ để liên kết."
            ),
            "data": {
                "Code": (
                    "ASSY_ALREADY_LINKED_TO_THIS_PACKING"
                    if result["AlreadyLinked"]
                    else "ASSY_LINK_ELIGIBLE"
                ),
                **result,
            },
        }

    except LinkageValidationError as error:
        return error_payload(error)
    except Exception as error:
        return {
            "success": False,
            "message": f"Lỗi kiểm tra linkage: {str(error)}",
            "data": {"Code": "ASSY_LINK_CHECK_FAILED"},
        }


@router.post(
    "/link_alias",
    status_code=status.HTTP_200_OK,
)
def link_master_alias(
    payload: LinkAliasPayload,
    db: Session = Depends(get_db),
):
    """
    Chỉ còn một implementation duy nhất cho route /link_alias.
    """
    try:
        result = create_active_assy_packing_link(
            db,
            assy_wo=int(payload.AliasWO),
            packing_wo=int(payload.PackingWO),
            created_by=payload.CreatedBy,
        )

        db.commit()

        return {
            "success": True,
            "message": (
                "Assy WO đã được liên kết với Packing WO này."
                if result["AlreadyLinked"]
                else "Liên kết thành công."
            ),
            "data": {
                "Code": (
                    "ASSY_ALREADY_LINKED_TO_THIS_PACKING"
                    if result["AlreadyLinked"]
                    else "ASSY_LINKED_SUCCESSFULLY"
                ),
                **result,
            },
        }

    except LinkageValidationError as error:
        db.rollback()
        return error_payload(error)
    except Exception as error:
        db.rollback()

        error_text = str(error)

        if (
            "UX_AssyPackingLinkage_ActiveAssy" in error_text
            or "2601" in error_text
            or "2627" in error_text
        ):
            return {
                "success": False,
                "message": (
                    "Assy WO vừa được liên kết bởi request khác. "
                    "Vui lòng tải lại."
                ),
                "data": {
                    "Code": "ASSY_ACTIVE_LINK_RACE_CONDITION"
                },
            }

        return {
            "success": False,
            "message": f"Lỗi DB: {error_text}",
            "data": {"Code": "ASSY_LINK_FAILED"},
        }


@router.post(
    "/log_material",
    status_code=status.HTTP_200_OK,
)
def log_master_material(
    payload: LogMaterialPayload,
    db: Session = Depends(get_db),
):
    try:
        canonical_wo = resolve_active_packing_wo(
            int(payload.PackingWO),
            db,
        )

        normalized_type = payload.Type.strip().upper()

        if normalized_type == "MAIN_INPUT":
            # MAIN_INPUT may also be a non-batch code; preserve that contract.
            # Existing registered Batch IDs must never bypass RW freeze.
            batch_states = db.execute(text("""
                SELECT IsFrozen, IsQCHeld FROM dbo.Batches_Master WITH (UPDLOCK, HOLDLOCK)
                WHERE Batch=:batch
            """), {"batch": payload.Code}).mappings().first()
            if batch_states and (bool(batch_states['IsFrozen']) or bool(batch_states['IsQCHeld'])):
                db.rollback()
                code = 'BATCH_FROZEN' if batch_states['IsFrozen'] else 'BATCH_QC_HOLD'
                return {"success": False, "message": code + ': Batch không được phép tiêu thụ.',
                        "data": {"Code": code}}
            query = text("""
                INSERT INTO dbo.InputMainLog
                (
                    WO,
                    BatchCode,
                    PartNumber,
                    Qty
                )
                VALUES
                (
                    :wo,
                    :code,
                    :pn,
                    :qty
                )
            """)
        elif normalized_type == "RAW_QTY":
            # Deprecated write path: RAW must pass through the authoritative
            # /validation/logRawMaterial endpoint with strict barcode validation.
            return {
                "success": False,
                "message": "RAW_QTY đã chuyển sang /validation/logRawMaterial (PN;QTY;UOM;SERIAL).",
                "data": {"Code": "RAW_LEGACY_ENDPOINT_DISABLED"},
            }
        else:
            return {
                "success": False,
                "message": (
                    "Type chỉ được phép là MAIN_INPUT hoặc RAW_QTY."
                ),
            }

        db.execute(
            query,
            {
                "wo": canonical_wo,
                "code": payload.Code,
                "pn": payload.PartNumber,
                "qty": payload.QTY,
            },
        )

        db.commit()

        return {
            "success": True,
            "message": "Ghi nhận thành công.",
            "data": {
                "RequestedWO": payload.PackingWO,
                "CanonicalWO": canonical_wo,
            },
        }

    except Exception as error:
        db.rollback()
        return {
            "success": False,
            "message": f"Lỗi ghi nhận: {str(error)}",
        }



@router.get(
    "/get_open_box/{packing_wo}",
    status_code=status.HTTP_200_OK,
)
def get_open_packing_box(
    packing_wo: int,
    db: Session = Depends(get_db),
):
    """
    Load thùng gần nhất còn Status = 0 của Packing WO.

    Box_Status là nguồn trạng thái thùng.
    Box_Master là nguồn danh sách item realtime.
    """
    try:
        canonical_wo = resolve_active_packing_wo(
            packing_wo,
            db,
        )

        box_row = db.execute(
            text("""
                SELECT TOP 1
                    Box_ID,
                    Model,
                    Create_Date
                FROM dbo.Box_Status
                WHERE WO = :wo
                  AND Status = 0
                ORDER BY Create_Date DESC
            """),
            {"wo": canonical_wo},
        ).fetchone()

        if not box_row:
            return {
                "success": True,
                "message": "WO không có thùng đang đóng dở.",
                "data": None,
            }

        box_id = str(box_row[0]).strip()
        model_no = str(box_row[1]).strip()
        created_at = box_row[2]

        _, target_qty = _load_box_rule(
            db,
            model_no,
        )

        item_rows = db.execute(
            text("""
                SELECT
                    Product,
                    Time
                FROM dbo.Box_Master
                WHERE BoxID = :box_id
                  AND from_WO = :wo
                ORDER BY Time DESC
            """),
            {
                "box_id": box_id,
                "wo": canonical_wo,
            },
        ).fetchall()

        return {
            "success": True,
            "message": "Đã tải thùng đang đóng dở.",
            "data": {
                "id": box_id,
                "model": model_no,
                "maxQty": target_qty,
                "isFinished": False,
                "createdAt": (
                    created_at.strftime("%H:%M:%S")
                    if created_at
                    else ""
                ),
                "items": [
                    _format_box_item(
                        row[0],
                        row[1],
                    )
                    for row in item_rows
                ],
                "skipReason": "",
            },
        }

    except Exception as error:
        return {
            "success": False,
            "message": (
                "Lỗi khi tải thùng đang đóng dở: "
                f"{str(error)}"
            ),
        }


@router.post(
    "/create_box",
    status_code=status.HTTP_200_OK,
)
def create_packing_box(
    payload: CreateBoxPayload,
    db: Session = Depends(get_db),
):
    """
    Giữ validation mã box như UI hiện tại, sau đó tạo Box_Status Status = 0.
    """
    try:
        canonical_wo = resolve_active_packing_wo(
            int(payload.PackingWO),
            db,
        )
        box_id = payload.BoxId.strip()

        model_no = get_job_part_number(
            db,
            canonical_wo,
        )

        if not model_no:
            return {
                "success": False,
                "message": (
                    f"Không tìm thấy Model của WO {canonical_wo}."
                ),
            }

        box_rule, target_qty = _load_box_rule(
            db,
            model_no,
        )

        validation_message = _validate_box_code(
            box_id,
            box_rule,
        )

        if validation_message:
            return {
                "success": False,
                "message": validation_message,
            }

        open_box = db.execute(
            text("""
                SELECT TOP 1 Box_ID
                FROM dbo.Box_Status
                WHERE WO = :wo
                  AND Status = 0
                ORDER BY Create_Date DESC
            """),
            {"wo": canonical_wo},
        ).fetchone()

        if open_box:
            return {
                "success": False,
                "message": (
                    f"WO {canonical_wo} đang có thùng "
                    f"{open_box[0]} chưa hoàn tất."
                ),
            }

        box_exists = db.execute(
            text("""
                SELECT TOP 1 BoxCode
                FROM
                (
                    SELECT Box_ID AS BoxCode
                    FROM dbo.Box_Status
                    WHERE Box_ID = :box_id

                    UNION ALL

                    SELECT Batch AS BoxCode
                    FROM dbo.Batches_Master
                    WHERE Batch = :box_id

                    UNION ALL

                    SELECT BoxID AS BoxCode
                    FROM dbo.Box_Master
                    WHERE BoxID = :box_id
                ) AS ExistingBox
            """),
            {"box_id": box_id},
        ).fetchone()

        if box_exists:
            return {
                "success": False,
                "message": (
                    f"Mã Bao bì {box_id} đã tồn tại trong hệ thống."
                ),
            }

        inserted = db.execute(
            text("""
                INSERT INTO dbo.Box_Status
                (
                    Box_ID,
                    WO,
                    Model,
                    Create_Date,
                    Status
                )
                OUTPUT INSERTED.Create_Date
                VALUES
                (
                    :box_id,
                    :wo,
                    :model,
                    SYSUTCDATETIME(),
                    0
                )
            """),
            {
                "box_id": box_id,
                "wo": canonical_wo,
                "model": model_no,
            },
        ).fetchone()

        db.commit()
        created_at = inserted[0] if inserted else None

        return {
            "success": True,
            "message": "Đã tạo thùng mới.",
            "data": {
                "id": box_id,
                "model": model_no,
                "maxQty": target_qty,
                "isFinished": False,
                "createdAt": (
                    created_at.strftime("%H:%M:%S")
                    if created_at
                    else ""
                ),
                "items": [],
                "skipReason": "",
            },
        }

    except Exception as error:
        db.rollback()
        return {
            "success": False,
            "message": f"Lỗi khi tạo thùng: {str(error)}",
        }


@router.post(
    "/log_box_item",
    status_code=status.HTTP_200_OK,
)
def log_box_item_realtime(
    payload: LogBoxItemPayload,
    db: Session = Depends(get_db),
):
    """Scan item nào thì commit item đó trực tiếp vào Box_Master."""
    try:
        canonical_wo = resolve_active_packing_wo(
            int(payload.PackingWO),
            db,
        )
        box_id = payload.BoxId.strip()
        item_code = payload.ItemCode.strip()

        if not item_code:
            return {
                "success": False,
                "message": "Mã sản phẩm không được để trống.",
            }

        box_row = db.execute(
            text("""
                SELECT
                    Model
                FROM dbo.Box_Status WITH (UPDLOCK, HOLDLOCK)
                WHERE Box_ID = :box_id
                  AND WO = :wo
                  AND Status = 0
            """),
            {
                "box_id": box_id,
                "wo": canonical_wo,
            },
        ).fetchone()

        if not box_row:
            return {
                "success": False,
                "message": "Không tìm thấy thùng đang mở.",
            }

        model_no = str(box_row[0]).strip()
        _, target_qty = _load_box_rule(
            db,
            model_no,
        )

        current_qty = int(
            db.execute(
                text("""
                    SELECT COUNT(*)
                    FROM dbo.Box_Master
                    WHERE BoxID = :box_id
                      AND from_WO = :wo
                """),
                {
                    "box_id": box_id,
                    "wo": canonical_wo,
                },
            ).scalar()
            or 0
        )

        if current_qty >= target_qty:
            return {
                "success": False,
                "message": "Thùng đã đạt định mức tối đa.",
            }

        inserted = db.execute(
            text("""
                INSERT INTO dbo.Box_Master
                (
                    BoxID,
                    Product,
                    Time,
                    from_WO
                )
                OUTPUT INSERTED.Time
                VALUES
                (
                    :box_id,
                    :item_code,
                    SYSUTCDATETIME(),
                    :wo
                )
            """),
            {
                "box_id": box_id,
                "item_code": item_code,
                "wo": canonical_wo,
            },
        ).fetchone()

        db.commit()
        created_at = inserted[0] if inserted else None
        new_qty = current_qty + 1

        return {
            "success": True,
            "message": "Đã ghi nhận sản phẩm vào thùng.",
            "data": {
                "BoxId": box_id,
                "CurrentQty": new_qty,
                "TargetQty": target_qty,
                "IsFull": new_qty >= target_qty,
                "Item": _format_box_item(
                    item_code,
                    created_at,
                ),
            },
        }

    except Exception as error:
        db.rollback()
        return {
            "success": False,
            "message": (
                f"Lỗi khi ghi sản phẩm vào thùng: {str(error)}"
            ),
        }


@router.post(
    "/remove_box_item",
    status_code=status.HTTP_200_OK,
)
def remove_box_item_realtime(
    payload: RemoveBoxItemPayload,
    db: Session = Depends(get_db),
):
    """Giữ nguyên nút xóa item của UI cũ."""
    try:
        canonical_wo = resolve_active_packing_wo(
            int(payload.PackingWO),
            db,
        )
        box_id = payload.BoxId.strip()
        item_code = payload.ItemCode.strip()

        open_box = db.execute(
            text("""
                SELECT TOP 1 1
                FROM dbo.Box_Status
                WHERE Box_ID = :box_id
                  AND WO = :wo
                  AND Status = 0
            """),
            {
                "box_id": box_id,
                "wo": canonical_wo,
            },
        ).fetchone()

        if not open_box:
            return {
                "success": False,
                "message": "Chỉ có thể xóa item khỏi thùng đang mở.",
            }

        result = db.execute(
            text("""
                WITH ItemToDelete AS
                (
                    SELECT TOP 1 *
                    FROM dbo.Box_Master
                    WHERE BoxID = :box_id
                      AND Product = :item_code
                      AND from_WO = :wo
                    ORDER BY Time DESC
                )
                DELETE FROM ItemToDelete;
            """),
            {
                "box_id": box_id,
                "item_code": item_code,
                "wo": canonical_wo,
            },
        )

        if int(result.rowcount or 0) == 0:
            db.rollback()
            return {
                "success": False,
                "message": "Không tìm thấy item cần xóa.",
            }

        db.commit()

        return {
            "success": True,
            "message": "Đã xóa item khỏi thùng.",
        }

    except Exception as error:
        db.rollback()
        return {
            "success": False,
            "message": f"Lỗi khi xóa item: {str(error)}",
        }


@router.post(
    "/delete_open_box",
    status_code=status.HTTP_200_OK,
)
def delete_open_box(
    payload: DeleteOpenBoxPayload,
    db: Session = Depends(get_db),
):
    """Giữ nguyên chức năng hủy thùng của UI cũ."""
    try:
        canonical_wo = resolve_active_packing_wo(
            int(payload.PackingWO),
            db,
        )
        box_id = payload.BoxId.strip()

        open_box = db.execute(
            text("""
                SELECT TOP 1 1
                FROM dbo.Box_Status
                WHERE Box_ID = :box_id
                  AND WO = :wo
                  AND Status = 0
            """),
            {
                "box_id": box_id,
                "wo": canonical_wo,
            },
        ).fetchone()

        if not open_box:
            return {
                "success": False,
                "message": "Không tìm thấy thùng đang mở để hủy.",
            }

        db.execute(
            text("""
                DELETE FROM dbo.Box_Master
                WHERE BoxID = :box_id
                  AND from_WO = :wo
            """),
            {
                "box_id": box_id,
                "wo": canonical_wo,
            },
        )

        db.execute(
            text("""
                DELETE FROM dbo.Box_Status
                WHERE Box_ID = :box_id
                  AND WO = :wo
                  AND Status = 0
            """),
            {
                "box_id": box_id,
                "wo": canonical_wo,
            },
        )

        db.commit()

        return {
            "success": True,
            "message": "Đã hủy thùng đang đóng.",
        }

    except Exception as error:
        db.rollback()
        return {
            "success": False,
            "message": f"Lỗi khi hủy thùng: {str(error)}",
        }


@router.post(
    "/finish_box",
    status_code=status.HTTP_200_OK,
)
def finish_box(
    payload: FinishBoxPayload,
    db: Session = Depends(get_db),
):
    """
    Xác nhận đóng/skip thùng.

    Item không được gửi lại từ frontend; backend đọc trực tiếp Box_Master.
    """
    try:
        canonical_wo = resolve_active_packing_wo(
            int(payload.PackingWO),
            db,
        )
        box_id = payload.BoxId.strip()

        box_row = db.execute(
            text("""
                SELECT
                    Model,
                    Status
                FROM dbo.Box_Status WITH (UPDLOCK, HOLDLOCK)
                WHERE Box_ID = :box_id
                  AND WO = :wo
            """),
            {
                "box_id": box_id,
                "wo": canonical_wo,
            },
        ).fetchone()

        if not box_row:
            return {
                "success": False,
                "message": "Không tìm thấy trạng thái của thùng.",
            }

        if int(box_row[1]) == 1:
            return {
                "success": True,
                "message": "Thùng đã được hoàn tất trước đó.",
                "data": {
                    "BoxId": box_id,
                    "IsFinished": True,
                },
            }

        model_no = str(box_row[0]).strip()
        _, target_qty = _load_box_rule(
            db,
            model_no,
        )

        items = db.execute(
            text("""
                SELECT
                    Product,
                    Time
                FROM dbo.Box_Master
                WHERE BoxID = :box_id
                  AND from_WO = :wo
                ORDER BY Time ASC
            """),
            {
                "box_id": box_id,
                "wo": canonical_wo,
            },
        ).fetchall()

        actual_qty = len(items)

        if actual_qty <= 0:
            return {
                "success": False,
                "message": "Thùng chưa có sản phẩm.",
            }

        if (
            not payload.IsSkipped
            and actual_qty < target_qty
        ):
            return {
                "success": False,
                "message": (
                    f"Thùng mới có {actual_qty}/{target_qty} sản phẩm. "
                    "Hãy dùng chức năng Xuất ngoại lệ để đóng non."
                ),
            }

        skip_reason = (
            (payload.SkipReason or "").strip()
            if payload.IsSkipped
            else ""
        )

        if payload.IsSkipped and not skip_reason:
            return {
                "success": False,
                "message": "Vui lòng nhập lý do đóng non.",
            }

        output_exists = db.execute(
            text("""
                SELECT TOP 1 Batch
                FROM dbo.Batches_Master
                WHERE Batch = :box_id
            """),
            {"box_id": box_id},
        ).fetchone()

        if output_exists:
            return {
                "success": False,
                "message": (
                    f"Thùng {box_id} đã tồn tại trong dữ liệu output."
                ),
            }

        if payload.IsSkipped:
            db.execute(
                text("""
                    INSERT INTO dbo.Master_WO_Message
                    (
                        WO,
                        MessageType,
                        Content
                    )
                    VALUES
                    (
                        :wo,
                        3,
                        :content
                    )
                """),
                {
                    "wo": canonical_wo,
                    "content": (
                        f"Đóng non hộp {box_id} ({actual_qty} pcs). "
                        f"Lý do: {skip_reason}"
                    ),
                },
            )

        db.execute(
            text("""
                INSERT INTO dbo.Batches_Master
                (
                    Batch,
                    PartNO,
                    QTY,
                    Born_by_WO,
                    Born_time
                )
                VALUES
                (
                    :box_id,
                    :pn,
                    :qty,
                    :wo,
                    SYSUTCDATETIME()
                )
            """),
            {
                "box_id": box_id,
                "pn": payload.PN.strip(),
                "qty": actual_qty,
                "wo": canonical_wo,
            },
        )

        db.execute(
            text("""
                UPDATE dbo.Master_WO_Log
                SET
                    QTY_Processed = QTY_Processed + :qty,
                    QTY_OK = QTY_OK + :qty
                WHERE WO = :wo
            """),
            {
                "qty": actual_qty,
                "wo": canonical_wo,
            },
        )

        db.execute(
            text("""
                UPDATE dbo.Box_Status
                SET Status = 1
                WHERE Box_ID = :box_id
                  AND WO = :wo
                  AND Status = 0
            """),
            {
                "box_id": box_id,
                "wo": canonical_wo,
            },
        )

        db.commit()

        return {
            "success": True,
            "message": (
                f"Đã chốt thùng {box_id} "
                f"với {actual_qty} sản phẩm."
            ),
            "data": {
                "BoxId": box_id,
                "BoxQty": actual_qty,
                "IsFinished": True,
                "IsSkipped": payload.IsSkipped,
                "SkipReason": skip_reason,
            },
        }

    except Exception as error:
        db.rollback()
        return {
            "success": False,
            "message": f"Lỗi khi chốt thùng: {str(error)}",
        }


@router.post(
    "/mark_done",
    status_code=status.HTTP_200_OK,
)
def mark_master_done(
    payload: MarkDonePayload,
    db: Session = Depends(get_db),
):
    try:
        canonical_wo = resolve_active_packing_wo(
            int(payload.PackingWO),
            db,
        )

        db.execute(
            text("""
                UPDATE dbo.IPTH_WorkOrders
                SET Status = 2
                WHERE WO = :wo
            """),
            {"wo": canonical_wo},
        )

        db.execute(
            text("""
                UPDATE dbo.Master_WO_Log
                SET Status = 2
                WHERE WO = :wo
            """),
            {"wo": canonical_wo},
        )

        deactivated_count = (
            deactivate_links_for_packing(
                db,
                canonical_wo,
            )
        )

        # Không tự động đóng Assy WO. Assy WO có thể phục vụ Packing khác.
        db.commit()

        return {
            "success": True,
            "message": "Chốt Packing Master thành công.",
            "data": {
                "PackingWO": canonical_wo,
                "DeactivatedLinks": deactivated_count,
            },
        }

    except Exception as error:
        db.rollback()
        return {
            "success": False,
            "message": str(error),
        }