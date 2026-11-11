# MES2 RW — Source impact & verified findings

> **Evidence:** các file source trong `IPTH_Source_20261107_033151Z.zip` thu thập 2026-11-07 và schema `IPTH_MES2_Audit_20261107T032555Z(1).zip`. Đây là snapshot; **phải chạy auditor trên project hiện tại trước khi sửa code**.

## Hành vi có bằng chứng trực tiếp

| Thành phần | Bằng chứng source | Ý nghĩa |
|---|---|---|
| `BE/app/api/v1/endpoints/WoValidation.py` | `validate_work_order()` gọi SAP `get_sap_job`; `is_rework` có nhánh `UPDATE Master_WO_Log SET Type = 'Rework'` và nhánh tạo WO mới `Type = 'Rework'`. | RW 1-1 làm thay đổi Type của production WO; BULK WO chưa có trên SAP không thể qua validate hiện tại. |
| `FE/src/components/production/ActiveJobView.jsx` | `mode === 'rework'` được chuyển vào `validateWorkOrder(..., isRework)`. | Entry point FE còn gắn RW vào validation production legacy. |
| `BE/app/api/v1/endpoints/batchallocation.py` | `/status/{wo}` đọc `Batches_Master.Status` (0/1/2 = Wait-Verify/Wait-Printing/Exported). `/generate` tính `remaining = QTY_OK - SUM(Batches_Master.QTY)`. | Chưa có RW pool, freeze hoặc lifecycle hợp lệ độc lập với print status. |
| `FE/src/components/production/FrameBatchAllocator.jsx` | `totalProducedOK`, `totalAllocated` và `remainingToAllocate` suy ra từ WO + các cards. | Dashboard 4 metric cần đồng bộ FE/BE, không chỉ thêm chỉ số UI. |
| `BE/app/api/v1/endpoints/traceability.py` | `build_wo_tree` và `build_reverse_trace_graph` truy `Batches_Master` + `Batches_Consumption_Log` theo WO. | Bulk RW cần **cắt nhánh upstream ở điểm Bulk** trên cây, không xóa data gốc. |
| `FE/src/components/traceability/TraceabilityView.jsx` | `node.Type === 'Rework'` điều khiển label/icons. | 1-1 cần RW mark độc lập với Type; Bulk cần vẫn có mark mà không đòi đổi type production. |
| `BE/app/api/v1/endpoints/WoValidation.py` | `/logInputMain`, `/transferInputBatch` thao tác `Batches_Consumption_Log`. | Freeze phải kiểm tra ở **mọi** API tiếp nhận/di chuyển batch, không chỉ giao diện RW. |

## Schema snapshot — đã xác minh

- `dbo.Master_WO_Log`: `WO BIGINT PK`, `Type NVARCHAR`, `QTY_OK INT`, `QTY_Processed INT`, `QTY_NG INT`, `QTY_Target INT`, `Status TINYINT`.
- `dbo.Batches_Master`: `ID BIGINT PK`, `Batch NVARCHAR` unique, `QTY INT`, `Born_by_WO BIGINT`, `Status INT`, `PartNO`, `Born_time`.
- `dbo.Batches_Consumption_Log`: `ID BIGINT PK`, `Batch_ID`, `Used_by_WO`, `Used_QTY INT`, `Used_time`, `IsCurrent BIT`; có FK về `Batches_Master` và filtered unique index trên batch hiện hành.
- Schema snapshot **chưa có** bảng `MES_ReworkJobs`, `MES_ReworkInputs`, `MES_ReworkOutputs`. Không có nghĩa rằng DB hiện tại vẫn chưa có các bảng này; auditor phải xác nhận.

## Điểm gây lỗi nếu triển khai vội

1. Freeze Input Batch khi nó đã được nhận ở downstream: phải xét lịch sử/current consumption, handoff/recall, sự kiện đã đóng gói.
2. Không dùng `Batches_Master.Status` (quy trình in) để chứa `FROZEN` (lifecycle hợp lệ). Cần cột/bảng chuyên biệt.
3. Output RW được phát hành lần sau không được cộng lại vào `QTY_OK` và gây double allocation. Phải xác định trạng thái `ReworkedQty` lũy kế, `allocated_reworked_qty` và batch invalidation.
4. Nhiều máy cùng nhận một batch vào RW: transaction + index/locking chặn double freeze.
5. ONE_TO_ONE và BULK cần bản ghi loại RW bền vững để phục hồi qua ngày/ca.
6. Đối với Bulk, thông tin Batch Input vẫn lưu ở RW Details; cây phả hệ chỉ cắt khi render/traverse.
7. Tham chiếu `SmartRepair` hiện tại phục vụ luồng repair Assy/Packing/Outsource; **không tự đồng nhất** với nghiệp vụ rework batch.

## Cần đối chiếu lại trên máy Dev

`WoValidation.py`, `batchallocation.py`, `traceability.py`, `packing_master.py`, `smart_repair.py`, FE `ActiveJobView.jsx`, `FrameBatchAllocator.jsx`, `TraceabilityView.jsx`, `AllocationView.jsx`, `FrameMachiningProc.jsx`, `FrameAssyPackingMaster.jsx`, API wrappers, `ModelConfigStore.js`, và mọi file mới phát sinh sau audit 07/11. Collector request đính kèm.
