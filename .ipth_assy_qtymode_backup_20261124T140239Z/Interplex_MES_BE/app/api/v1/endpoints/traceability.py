from app.services.raw_material_service import get_raw_material_history
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.db.session import SessionLocal
from app.schemas.WoValidationResponse import StandardResponse
from app.schemas.traceability import ReverseTraceRequest


router = APIRouter()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _serialize_datetime(value):
    if value is None:
        return None
    if hasattr(value, "isoformat"):
        return value.isoformat()
    return str(value)


# ==========================================
# API 1: TÌM BOX DỰA TRÊN SẢN PHẨM / SERIAL
# ==========================================
@router.get("/boxbyproduct/{product_id}", response_model=StandardResponse)
async def search_box_by_product(
    product_id: str,
    db: Session = Depends(get_db),
):
    try:
        query = text("""
            SELECT TOP 31
                BoxID,
                MAX(Time) AS PackTime
            FROM Box_Master
            WHERE Product = :product_id
            GROUP BY BoxID
            ORDER BY PackTime DESC
        """)

        results = db.execute(
            query,
            {"product_id": product_id},
        ).fetchall()

        count = len(results)

        if count == 0:
            return StandardResponse(
                success=False,
                message=(
                    f"Không tìm thấy Thùng nào chứa sản phẩm "
                    f"'{product_id}'."
                ),
            )

        # Giữ nguyên threshold hiện tại của hệ thống.
        if count > 5:
            return StandardResponse(
                success=False,
                message=(
                    f"Từ chối truy vết: Mã '{product_id}' không được "
                    "quản lý theo Serial Number (tìm thấy rất nhiều "
                    "Thùng). Vui lòng yêu cầu cấp mã Thùng (Box ID) "
                    "để truy vết."
                ),
            )

        box_list = [
            {
                "BoxID": row[0],
                "PackTime": str(row[1]),
            }
            for row in results
        ]

        warning_msg = None
        if count > 1:
            warning_msg = (
                "CẢNH BÁO TỚI QA: Phát hiện nguy cơ lặp tem "
                f"Serial Number! Mã '{product_id}' đang nằm ở "
                f"{count} Thùng khác nhau."
            )

        return StandardResponse(
            success=True,
            message="Found",
            data={
                "boxes": box_list,
                "warning": warning_msg,
            },
        )

    except Exception as exc:
        return StandardResponse(
            success=False,
            message=f"Lỗi máy chủ: {str(exc)}",
        )


# ==========================================
# FORWARD TRACE: TỪ WO HIỆN TẠI TÌM WO NGUỒN
# ==========================================
def build_wo_tree(
    wo_id: int,
    db: Session,
    visited: set,
):
    if wo_id in visited:
        return None

    visited.add(wo_id)

    wo_info = db.execute(
        text("""
            SELECT
                ModelNO,
                Type
            FROM Master_WO_Log
            WHERE WO = :wo
        """),
        {"wo": wo_id},
    ).fetchone()

    model_no = wo_info[0] if wo_info else "Unknown"
    wo_type = (
        wo_info[1]
        if wo_info and len(wo_info) > 1
        else "Normal"
    )

    rw_type = db.execute(text("""
        SELECT RW_Type FROM dbo.MES_ReworkJobs WHERE WO=:wo
    """), {"wo": wo_id}).scalar()

    # Schema mới:
    # WO hiện tại sử dụng Batch qua Batches_Consumption_Log.
    # WO nguồn nằm tại Batches_Master.Born_by_WO.
    ancestor_rows = db.execute(
        text("""
            SELECT DISTINCT
                B.Born_by_WO
            FROM dbo.Batches_Consumption_Log C
            INNER JOIN dbo.Batches_Master B
                ON B.ID = C.Batch_ID
            WHERE C.Used_by_WO = :wo
              AND B.Born_by_WO IS NOT NULL
        """),
        {"wo": wo_id},
    ).fetchall()

    # A BULK RW WO is intentionally a visible genealogy root. Original
    # source batch identifiers remain queryable via /rework/details/{wo}.
    if rw_type == "BULK":
        ancestor_rows = []
    children = []

    for ancestor in ancestor_rows:
        born_wo = ancestor[0]

        child_node = build_wo_tree(
            born_wo,
            db,
            visited.copy(),
        )

        if child_node:
            children.append(child_node)

    return {
        "WO": wo_id,
        "Model": model_no,
        "ModelNO": model_no,
        "Type": wo_type,
        "HasRework": rw_type is not None,
        "ReworkType": rw_type,
        "IsReworkRoot": rw_type == "BULK",
        "children": children,
    }


# ==========================================
# API 2: FORWARD TRACE TỪ BOX
# ==========================================
@router.get(
    "/boxforward/{box_id}",
    response_model=StandardResponse,
)
async def box_forward_trace(
    box_id: str,
    db: Session = Depends(get_db),
):
    try:
        root_wo_result = db.execute(
            text("""
                SELECT TOP 1
                    from_WO
                FROM Box_Master
                WHERE BoxID = :box_id
            """),
            {"box_id": box_id},
        ).fetchone()

        if not root_wo_result:
            # Fallback này vẫn thuộc Batches_Master vì đang hỏi
            # WO nào đã khai sinh mã Batch/Box.
            root_wo_result = db.execute(
                text("""
                    SELECT TOP 1
                        Born_by_WO
                    FROM dbo.Batches_Master
                    WHERE Batch = :box_id
                """),
                {"box_id": box_id},
            ).fetchone()

            if not root_wo_result or not root_wo_result[0]:
                return StandardResponse(
                    success=False,
                    message=(
                        "Không tìm thấy Lệnh sản xuất gốc "
                        "của Box này."
                    ),
                )

        root_wo = root_wo_result[0]
        tree_data = build_wo_tree(
            root_wo,
            db,
            set(),
        )

        return StandardResponse(
            success=True,
            message="Trace Forward Success",
            data=[tree_data],
        )

    except Exception as exc:
        return StandardResponse(
            success=False,
            message=(
                "Lỗi truy xuất cây phả hệ: "
                f"{str(exc)}"
            ),
        )


# MES2 Utilities: exact batch forward trace, not Box fallback or whole-WO scan.
@router.get('/tracebybatch/{batch_code}', response_model=StandardResponse)
async def trace_by_batch(batch_code: str, db: Session = Depends(get_db)):
    code = batch_code.strip()
    if not code or len(code) > 200:
        return StandardResponse(success=False, message='Mã Batch không hợp lệ.')
    try:
        batch = db.execute(text('''
            SELECT ID, Batch, PartNO, QTY, Born_by_WO, Born_time,
                   Status, IsFrozen, IsQCHeld, QCHeldAtUTC
            FROM dbo.Batches_Master WHERE Batch=:code
        '''), {'code': code}).mappings().first()
        if not batch:
            return StandardResponse(success=False, message='Không tìm thấy Batch trong Batches_Master.')
        usage = db.execute(text('''
            SELECT C.ID, C.Used_by_WO, C.Used_QTY, C.Used_time, C.IsCurrent
            FROM dbo.Batches_Consumption_Log C
            WHERE C.Batch_ID=:id
            ORDER BY C.Used_time, C.ID
        '''), {'id': batch['ID']}).mappings().all()
        producer = int(batch['Born_by_WO']) if batch['Born_by_WO'] is not None else None
        producer_name = None
        if producer is not None:
            producer_name = db.execute(text('''
                SELECT ModelNO FROM dbo.Master_WO_Log WHERE WO=:wo
            '''), {'wo': producer}).scalar()
        consumers = [{
            'WO': row['Used_by_WO'], 'UsedQTY': row['Used_QTY'],
            'UsedTime': _serialize_datetime(row['Used_time']),
            'IsCurrent': bool(row['IsCurrent']), 'ConsumptionID': row['ID'],
            'ModelNO': None, 'WOType': None,
        } for row in usage]
        # This intentionally shows ONLY verified edges of the scanned Batch.
        # Any descendants of consumer WOs would represent *all* their output
        # batches, not provable descendants of this one input batch.
        return StandardResponse(success=True, message='Exact Batch trace success', data={
            'Batch': batch['Batch'], 'BatchID': batch['ID'],
            'PartNO': batch['PartNO'], 'BornQTY': batch['QTY'],
            'BornWO': producer, 'BornTime': _serialize_datetime(batch['Born_time']),
            'ProducerModel': producer_name, 'PrintStatus': batch['Status'],
            'IsFrozen': bool(batch['IsFrozen']), 'IsQCHeld': bool(batch['IsQCHeld']),
            'QCHeldAtUTC': _serialize_datetime(batch['QCHeldAtUTC']),
            'DirectConsumers': consumers,
        })
    except Exception:
        return StandardResponse(success=False, message='Lỗi truy xuất Batch từ database.')


# ==========================================
# API 3: TRACE BATCHES THEO WO
# ==========================================
@router.get(
    "/batchestracebywo/{wo_id}",
    response_model=StandardResponse,
)
async def batches_trace_by_wo(
    wo_id: int,
    db: Session = Depends(get_db),
):
    try:
        rows = db.execute(
            text("""
                SELECT
                    B.Batch,
                    B.PartNO,
                    C.Used_QTY,
                    B.Born_by_WO,
                    C.Used_time,
                    C.IsCurrent,
                    B.QTY AS Born_QTY
                FROM dbo.Batches_Consumption_Log C
                INNER JOIN dbo.Batches_Master B
                    ON B.ID = C.Batch_ID
                WHERE C.Used_by_WO = :wo
                ORDER BY
                    C.Used_time DESC,
                    C.ID DESC
            """),
            {"wo": wo_id},
        ).fetchall()

        data = [
            {
                "Batch": row[0],
                "PartNO": row[1],
                "QTY": row[2],
                "BornWO": row[3],
                "Time": _serialize_datetime(row[4]),
                "IsCurrent": bool(row[5]),
                "BornQTY": row[6],
            }
            for row in rows
        ]

        return StandardResponse(
            success=True,
            message="Success",
            data=data,
        )

    except Exception as exc:
        return StandardResponse(
            success=False,
            message=f"Lỗi: {str(exc)}",
        )


# ==========================================
# API 4: TRACE RAW MATERIALS THEO WO
# ==========================================
@router.get(
    "/materialstracebywo/{wo_id}",
    response_model=StandardResponse,
)
async def materials_trace_by_wo(
    wo_id: int,
    db: Session = Depends(get_db),
):
    try:
        rows = get_raw_material_history(db, wo_id)
        data = [
            {
                "RawMaterial": item["code"], "PartNO": item["pn"],
                "QTY": item["qty"], "Time": item["timestamp"],
                "SerialNumber": item["serial"], "UOM": item["uom"],
                "IsCurrent": item["isCurrent"], "OriginalQTY": item["originalQty"],
                "ReceivedQTY": item["receivedQty"],
                "RemainderOutQTY": item["remainderOutQty"],
                "UsageID": item["id"],
            }
            for item in rows
        ]

        return StandardResponse(
            success=True,
            message="Success",
            data=data,
        )

    except Exception as exc:
        return StandardResponse(
            success=False,
            message=f"Lỗi: {str(exc)}",
        )


# ==========================================
# REVERSE TRACE GRAPH
# ==========================================
def build_reverse_trace_graph(
    wo_id: int,
    db: Session,
    current_path: set,
):
    """
    Dựng graph downstream theo quan hệ:

        Producer WO
            -> Batches_Master
            -> Batches_Consumption_Log
            -> Consumer WO

    current_path chỉ chống vòng lặp trong nhánh hiện tại.
    Không dùng global visited vì một WO có thể xuất hiện hợp lệ
    từ nhiều nhánh upstream khác nhau.
    """

    if wo_id in current_path:
        return {
            "WO": wo_id,
            "Model": "Cycle detected",
            "ModelNO": "Cycle detected",
            "Type": "Cycle",
            "Status": None,
            "QTY_Target": None,
            "QTY_OK": None,
            "boxes": [],
            "viaBatches": [],
            "children": [],
            "cycleDetected": True,
        }

    next_path = set(current_path)
    next_path.add(wo_id)

    wo_info = db.execute(
        text("""
            SELECT
                ModelNO,
                Type,
                Status,
                QTY_Target,
                QTY_OK
            FROM Master_WO_Log
            WHERE WO = :wo
        """),
        {"wo": wo_id},
    ).mappings().first()

    box_rows = db.execute(
        text("""
            SELECT DISTINCT
                BoxID
            FROM Box_Master
            WHERE from_WO = :wo
            ORDER BY BoxID
        """),
        {"wo": wo_id},
    ).mappings().all()

    edge_rows = db.execute(
        text("""
            SELECT
                C.Used_by_WO AS ConsumerWO,
                B.Batch,
                B.PartNO,
                B.QTY AS BornQTY,
                C.Used_QTY AS UsedQTY,
                C.Used_time AS UsedTime,
                C.IsCurrent
            FROM dbo.Batches_Master B
            INNER JOIN dbo.Batches_Consumption_Log C
                ON C.Batch_ID = B.ID
            WHERE B.Born_by_WO = :wo
              AND C.Used_by_WO IS NOT NULL
            ORDER BY
                C.Used_by_WO,
                B.Batch,
                C.Used_time,
                C.ID
        """),
        {"wo": wo_id},
    ).mappings().all()

    # Một Producer WO có thể truyền nhiều Batch cho cùng một Consumer WO.
    # Group theo Consumer WO để UI chỉ hiển thị một node WO, nhưng vẫn
    # giữ đầy đủ danh sách cạnh vật liệu trong viaBatches.
    grouped_edges = {}

    for edge in edge_rows:
        consumer_wo = edge["ConsumerWO"]

        grouped_edges.setdefault(
            consumer_wo,
            [],
        ).append({
            "Batch": edge["Batch"],
            "PartNO": edge["PartNO"],
            "BornQTY": edge["BornQTY"],
            "UsedQTY": edge["UsedQTY"],
            "UsedTime": _serialize_datetime(
                edge["UsedTime"]
            ),
            "IsCurrent": bool(edge["IsCurrent"]),
        })

    children = []

    for consumer_wo, via_batches in grouped_edges.items():
        child_node = build_reverse_trace_graph(
            consumer_wo,
            db,
            next_path,
        )

        child_node["viaBatches"] = via_batches
        children.append(child_node)

    rw_type = db.execute(text("""
        SELECT RW_Type FROM dbo.MES_ReworkJobs WHERE WO=:wo
    """), {"wo": wo_id}).scalar()

    model_no = (
        wo_info["ModelNO"]
        if wo_info
        else "Unknown"
    )

    return {
        "WO": wo_id,
        "Model": model_no,
        "ModelNO": model_no,
        "Type": (
            wo_info["Type"]
            if wo_info
            else "Unknown"
        ),
        "HasRework": rw_type is not None,
        "ReworkType": rw_type,
        "IsReworkRoot": rw_type == "BULK",
        "Status": (
            wo_info["Status"]
            if wo_info
            else None
        ),
        "QTY_Target": (
            wo_info["QTY_Target"]
            if wo_info
            else None
        ),
        "QTY_OK": (
            wo_info["QTY_OK"]
            if wo_info
            else None
        ),
        "boxes": [
            {"BoxID": row["BoxID"]}
            for row in box_rows
        ],
        "viaBatches": [],
        "children": children,
        "cycleDetected": False,
    }


# ==========================================
# API 5: REVERSE TRACE
# ==========================================
@router.post(
    "/ReverseTrace",
    response_model=StandardResponse,
)
async def reverse_trace(
    request: ReverseTraceRequest,
    db: Session = Depends(get_db),
):
    try:
        if not request.WOs:
            return StandardResponse(
                success=False,
                message="Danh sách WO trống.",
            )

        root_wos = list(dict.fromkeys(request.WOs))

        graph = [
            build_reverse_trace_graph(
                root_wo,
                db,
                set(),
            )
            for root_wo in root_wos
        ]

        # BFS phẳng vẫn được giữ để:
        # 1. Có danh sách WO duy nhất.
        # 2. Có danh sách Box duy nhất để export/khoanh vùng nhanh.
        affected_wos = set()
        queue = list(root_wos)
        flat_boxes = {}

        while queue:
            current_wo = queue.pop(0)

            if current_wo in affected_wos:
                continue

            affected_wos.add(current_wo)

            boxes = db.execute(
                text("""
                    SELECT DISTINCT
                        BoxID
                    FROM Box_Master
                    WHERE from_WO = :wo
                """),
                {"wo": current_wo},
            ).mappings().all()

            for row in boxes:
                flat_boxes[row["BoxID"]] = {
                    "BoxID": row["BoxID"],
                    "FromWO": current_wo,
                }

            downstream_rows = db.execute(
                text("""
                    SELECT DISTINCT
                        C.Used_by_WO
                    FROM dbo.Batches_Master B
                    INNER JOIN dbo.Batches_Consumption_Log C
                        ON C.Batch_ID = B.ID
                    WHERE B.Born_by_WO = :wo
                      AND C.Used_by_WO IS NOT NULL
                """),
                {"wo": current_wo},
            ).fetchall()

            for row in downstream_rows:
                downstream_wo = row[0]

                if downstream_wo not in affected_wos:
                    queue.append(downstream_wo)

        return StandardResponse(
            success=True,
            message="Reverse Trace Success",
            data={
                "graph": graph,
                "boxes": list(flat_boxes.values()),
                "affectedWOs": sorted(affected_wos),
            },
        )

    except Exception as exc:
        return StandardResponse(
            success=False,
            message=(
                "Lỗi truy xuất ngược: "
                f"{str(exc)}"
            ),
        )


# ==========================================
# API 6: TRACE DEFECT THEO WO
# ==========================================
@router.get(
    "/defectstracebywo/{wo_id}",
    response_model=StandardResponse,
)
async def defects_trace_by_wo(
    wo_id: int,
    db: Session = Depends(get_db),
):
    try:
        rows = db.execute(
            text("""
                SELECT
                    PN,
                    DefectCode,
                    Station,
                    QTY,
                    Description,
                    Time
                FROM Master_Defect_Log
                WHERE WO = :wo
                ORDER BY Time DESC
            """),
            {"wo": wo_id},
        ).fetchall()

        data = [
            {
                "PartNO": row[0],
                "DefectCode": row[1],
                "Station": row[2],
                "QTY": row[3],
                "Description": row[4],
                "Time": _serialize_datetime(row[5]),
            }
            for row in rows
        ]

        return StandardResponse(
            success=True,
            message="Success",
            data=data,
        )

    except Exception as exc:
        return StandardResponse(
            success=False,
            message=f"Lỗi: {str(exc)}",
        )


# ==========================================
# API 7: TRUY VẾT THEO WO / ASSY-PACKING LINKAGE
# ==========================================
@router.get(
    "/tracebywo/{wo_id}",
    response_model=StandardResponse,
)
async def trace_by_wo(
    wo_id: int,
    db: Session = Depends(get_db),
):
    try:
        wo_exists = db.execute(
            text("""
                SELECT 1
                FROM Master_WO_Log
                WHERE WO = :wo
            """),
            {"wo": wo_id},
        ).fetchone()

        if not wo_exists:
            return StandardResponse(
                success=False,
                message=(
                    f"Không tìm thấy Lệnh Sản Xuất "
                    f"(WO) {wo_id} trong hệ thống."
                ),
            )

        tree_data = build_wo_tree(
            wo_id,
            db,
            set(),
        )

        return StandardResponse(
            success=True,
            message="Truy vết genealogy theo WO thành công",
            data=tree_data,
        )

    except Exception as exc:
        return StandardResponse(
            success=False,
            message=f"Lỗi truy vết WO: {str(exc)}",
        )