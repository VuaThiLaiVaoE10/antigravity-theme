# Mô-đun So Sánh & Xuất Video/APNG (Export & Compare Module)

Mô-đun phụ trách so sánh hình ảnh trước/sau và xuất video hoặc APNG tuần hoàn mượt mà không có điểm nối (0-jerk seam).

---

## 1. Các Tính Năng Chính
- **So sánh Trước / Sau**:
  - Vạch chia màn hình kéo trượt (`compareRatio`: 0.0 .. 1.0, bên trái ảnh tĩnh, bên phải ảnh động).
  - Giữ phím / chuột để so ảnh gốc (`holdToCompare: true/false`).
- **Xem chậm (Slow-motion)**:
  - Tùy chỉnh tốc độ phát lại: 0.25x (siêu chậm để soi chi tiết), 0.5x, 1.0x (chuẩn), 2.0x (nhanh).
- **Xuất video / APNG vòng lặp**:
  - Xuất WebM, MP4 hoặc APNG với chu kỳ đúng $T$ giây (mặc định 12s từ `loopPeriodSec`).
  - Hỗ trợ 30 FPS hoặc 60 FPS, báo tiến trình chi tiết qua event bus.

---

## 2. Hợp Đồng Đầu Vào & Đầu Ra

### Đầu vào
- `compare:ratio`: Tỉ lệ vạch chia so sánh hoặc `null` để tắt.
- `compare:hold`: Trạng thái giữ phím so sánh (`true`/`false`).
- `playback:rate`: Tốc độ xem lại (`0.25`, `0.5`, `1.0`, `2.0`).
- `export:start`: Cấu hình xuất video `{ format, fps, loopDurationSec }`.

### Đầu ra
- `compare:changed`: Trạng thái và vị trí vạch chia.
- `playback:rate-changed`: Tốc độ phát hiện tại.
- `export:progress`: Tiến độ xuất `{ currentFrame, totalFrames, percent }`.
- `export:done`: Kết quả xuất thành công `{ format, totalFrames, durationSec, estimatedBytes }`.

### Sự Kiện
- **Lắng nghe**: `compare:ratio`, `compare:hold`, `playback:rate`, `export:start`.
- **Phát ra**: `compare:changed`, `playback:rate-changed`, `export:progress`, `export:done`.
