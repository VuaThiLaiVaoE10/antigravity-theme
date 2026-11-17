# Mô-đun Parallax (Mouse 3D Parallax Module)

Mô-đun phụ trách tính toán hiệu ứng Parallax 3D theo con trỏ chuột độc lập cho từng lớp của Theme.

---

## 1. Nguyên Lý Hoạt Động
- Lớp ở xa (`depth <= 0.3`): Dịch chuyển ít hoặc ngược chiều để tạo cảm giác sâu.
- Lớp ở gần (`depth >= 0.7`): Dịch chuyển nhiều theo hướng chuột.
- Làm mượt chuyển động chuột bằng bộ lọc hàm mũ Lerp (`CFG.parallax.tau: 0.25`), loại bỏ hoàn toàn hiện tượng rung lắc/giật cục.
- Cho phép Bật/Tắt hoàn toàn: Khi tắt, độ dịch chuyển của mọi lớp trả về $(0, 0)$.

---

## 2. Hợp Đồng Đầu Vào & Đầu Ra

### Đầu vào
- `mouse:move`: Tọa độ chuột chuẩn hóa `normX`, `normY` trong khoảng $[-1.0, 1.0]$.
- `parallax:toggle`: Bật/tắt cờ `enabled`.
- `preview:render`: Xung nhịp thời gian để cập nhật Lerp.

### Đầu ra
- `parallax:calculated`: Vector dịch chuyển `{ dx, dy }` cho từng `layer.id`.

### Sự Kiện
- **Lắng nghe**: `mouse:move`, `parallax:toggle`, `preview:render`.
- **Phát ra**: `parallax:calculated`.
