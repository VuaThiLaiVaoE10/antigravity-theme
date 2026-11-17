# DECISIONS.md - Sổ Ghi Nhận Quyết Định Kiến Trúc (Architecture Decisions Log)

## D-007: Tích Hợp Neo Đàn Hồi (Vật Lý Tóc physics.js) Vào Chuyển Động Theo Lớp
- **Ngày quyết định**: 2026-11-17
- **Người duyệt**: User & Coordinator
- **Trạng thái**: ĐÃ DUYỆT (Phương án A kèm 4 điều kiện)
- **Nội dung & Ràng buộc bắt buộc**:
  1. **Mặc định TẮT**: Neo đàn hồi (`renderer/physics.js`) mặc định TẮT cho mọi lớp mới tạo. Người dùng phải chủ động bật nếu chi tiết là tóc, vạt áo, ruy băng.
  2. **Đổi đơn vị sang ‰**: `maxDisplacement` chuyển đổi 100% sang đơn vị ‰ cạnh dài ảnh (`ampPx = amp * max(W,H)/1000`) và bị kẹp trần bởi giới hạn trong `CFG` (giá trị cũ 35px ≈ 17‰ bị bãi bỏ vì vượt xa trần 3‰).
  3. **Kẹp biên độ tổng bằng tanh**: Tổng dịch chuyển vector (chuyển động lớp + dao động đàn hồi neo) được kẹp mượt bằng hàm hyperbolic tangent $\tanh$ theo đúng giới hạn ‰ của kiểu chuyển động tương ứng trong `CFG`.
  4. **Bảo toàn vòng lặp Seam 0 Jerk**: Khi kích hoạt "Kiểm tra vòng lặp" hoặc "Xuất video", hệ thống phải tạm tắt hiệu ứng vật lý tự do (hoặc thực hiện chu kỳ khởi động pre-warm) để đảm bảo đầu = cuối ($t=0$ vs $t=T$) đạt độ liền mạch tuyệt đối.

---

## D-008: Cơ Chế Vùng An Toàn (Safe Zone) Bảo Vệ Khung Chat & Chữ Đọc
- **Ngày quyết định**: 2026-11-17
- **Người duyệt**: User & Coordinator
- **Trạng thái**: ĐÃ DUYỆT (Phương án A)
- **Nội dung & Ràng buộc bắt buộc**:
  1. **Đọc được chữ quan trọng hơn đẹp**: Tự động khóa tĩnh (độ dịch chuyển = 0 hoặc suy giảm mạnh) toàn bộ vùng khung chat, ô nhập lệnh (composer) và thanh bên (sidebar).
  2. **Không số cứng**: Vị trí và kích thước vùng an toàn được đo đạc động trực tiếp từ tọa độ bố cục thực tế của Live Preview (`getBoundingClientRect()` của `#previewChat`, `#composerInput`, v.v.), tuyệt đối cấm hardcode tọa độ px.
  3. **Viền mềm chuẩn hóa**: Bán kính chuyển tiếp làm mềm viền (feathering) sử dụng `CFG.safe.featherPermille`, không sử dụng giá trị 40px cứng.
  4. **Kiểm soát người dùng**: Cung cấp công tắc Bật/Tắt hiển thị Vùng an toàn trên canvas và cho phép người dùng kéo chỉnh vị trí/kích thước nếu bố cục bị lệch.

---

## D-009: Cơ Chế Làm Dịu Chuyển Động Khi Đang Gõ Phím (Focus Shield)
- **Ngày quyết định**: 2026-11-17
- **Người duyệt**: User & Coordinator
- **Trạng thái**: ĐÃ DUYỆT (Phương án A)
- **Nội dung & Ràng buộc bắt buộc**:
  1. **Tự động làm dịu**: Khi phát hiện sự kiện người dùng đang gõ phím (`user-typing` qua Event Bus), toàn bộ chuyển động nền lập tức giảm biên độ xuống còn 20% để mắt tập trung vào văn bản.
  2. **Tự động hồi phục**: Khi người dùng dừng gõ sau 3 giây, biên độ nhẹ nhàng nâng dần trở lại 100%.
  3. **Nguồn sự thật CFG**: Toàn bộ tốc độ chuyển tiếp nội suy (easing / lerp step), tỷ lệ giảm (20%) và thời gian chờ phục hồi (3s) được lấy trực tiếp từ `CFG.calm`, cấm đặt số cứng trong mã nguồn.
