# MES2 — Rework: quy tắc nghiệp vụ đã thống nhất

**Trạng thái:** Accepted business requirements, chưa triển khai vào production runtime.
**Đóng gói:** RW Phase 0, 2026-11-11.

## Phân loại và nhận diện

- **ONE_TO_ONE:** Người vận hành chọn Rework, nhập WO đã tồn tại là WO sản xuất. Sản xuất và RW có thể hoạt động song song; WO không bị đổi `Type` chỉ vì thực hiện RW.
- **BULK:** Người vận hành nhập WO mới chưa có trong hệ thống MES và khai báo là Bulk Rework, dùng gom batch lỗi từ nhiều Production WO. Vì luồng validate hiện tại yêu cầu tồn tại trên SAP, phần cho phép WO mới phải thiết kế rõ ở phase runtime.
- **Mở lại WO:** Nếu WO đã tồn tại trong sổ RW, phải dùng loại RW đã lưu. Không suy luận ONE_TO_ONE chỉ từ việc WO nay đã tồn tại.

## Batch và Output

- RW luôn theo **nguyên batch**; không có Partial Rework. Một lần RW có thể lấy nhiều Input Batch và tạo nhiều Output Batch (mối quan hệ nhiều-nhiều ở mức RW case).
- Khi **xác nhận nhận Input Batch vào RW**, batch gốc chuyển `FROZEN` vĩnh viễn. Không dùng được trong Production, Batch transfer, RW lần khác, Allocation hoặc downstream process. Không xóa bản ghi hay lịch sử.
- Output Reworked được tạo như **batch output mới**, có barcode duy nhất và được dùng downstream bình thường. Output này có thể tiếp tục là đầu vào một RW mới, lúc đó nó cũng bị `FROZEN`.
- Không cộng gộp input batch đã đóng băng với output mới để tính hàng hiệu lực. Lịch sử `Allocated`/tem đã in vẫn cần giữ để audit.

## Nhập liệu ở RW workbench

- Scan các Input Batch; ONE_TO_ONE phải xác thực nguồn theo WO đó, BULK cho phép input từ WO khác.
- Có mục scan RAW bổ sung: ONE_TO_ONE gắn với WO sản xuất gốc; BULK cần ghi cho WO Bulk.
- Nhập **Reworked Completed Qty lũy kế**, không phải delta. Backend phải bảo vệ concurrent update để không cộng trùng.

## Allocation

- Trên JOB có RW mark, có thêm metric **Reworked** ngoài Produced (OK), Allocated, Wait Allocate.
- Phải tách quyền cấp tem output RW chưa cấp phát khỏi lượng production chưa cấp phát; khi batch RW xuất ra, batch mới dùng được như sản phẩm bình thường.
- Chưa chốt công thức SQL chính xác: cần audit cách `QTY_OK`, sum bảng Batch và lịch sử allocated hoạt động thực tế trước khi sửa.

## Traceability

- ONE_TO_ONE: chỉ một WO node trên cây, có RW mark. Bấm mark hiển thị **Input Batches** và **Output Batches (Reworked)**.
- BULK: WO Bulk có RW mark, là **điểm gốc hiển thị của nhánh phả hệ**, không truy ngược những WO sản xuất ban đầu qua input batch khi dựng cây. Các Input Batch vẫn tồn tại trong lịch sử RW Details để truy vấn thủ công.
- Không tạo cây phả hệ lồng để mô tả RW ở mỗi lần thay thế; RW details là nơi theo dõi nguồn và đầu ra.

## Ngoài phạm vi Phase 0

Chưa tạo bảng, chưa chuyển `Master_WO_Log.Type`, chưa freeze batch, chưa sửa API/FE và chưa chạy SQL cập nhật. Phase 0 chỉ khảo sát, cố định yêu cầu, phát hành collector và tài liệu bàn giao.
