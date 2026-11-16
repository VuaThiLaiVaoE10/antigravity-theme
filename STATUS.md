# STATUS.md - Antigravity Theme Studio: Motion & Pet Events Upgrade

## 1. Trạng Thái Hiện Tại: BƯỚC 0 XONG
- Đã tách mã tab "Vẽ Chuyển Động" từ `renderer/app.js` thành các module độc lập.
- Đã thêm thẻ `<script>` / `<link>` và các mount point rỗng (`#petEventsMount`, `#motionUIMount`, `#previewPetSimBar`) trong `renderer/index.html`.
- Sau Bước 0: **CHỈ Coordinator** được phép sửa đổi `renderer/index.html` và `renderer/app.js`.

---

## 2. Phân Quyền Sở Hữu File Nghiêm Ngặt
| Thành Viên | File Sở Hữu Được Phép Sửa Đổi |
| :--- | :--- |
| **Worker A (`events-ui-dev`)** | `renderer/events.js`, `renderer/events.css`, `renderer/motion-ui.js`, `renderer/motion.css` |
| **Worker B (`motion-engine-dev`)** | `renderer/motion.js`, `renderer/depth.js` |
| **Coordinator** | `renderer/index.html`, `renderer/app.js`, `STATUS.md`, `REQUESTS.md`, `BLOCKERS.md` |

*Lưu ý:* Nếu Worker cần sửa file ngoài danh sách sở hữu hoặc cần thay đổi `index.html`/`app.js`, hãy ghi vào `REQUESTS.md`. Coordinator sẽ xử lý ngay mà Worker không phải chờ.

---

## 3. Hợp Đồng Dữ Liệu (Data Contract)
Cả hai Worker A và B bắt buộc tuân theo hợp đồng dữ liệu sau:

### 3.1. Motion & Layers Contract
```javascript
Layer = {
  id: string,              // Unique ID (e.g. 'layer-hair-1')
  name: string,            // Tên lớp (e.g. 'Tóc bay', 'Suối nước')
  color: string,           // Mã màu nhận diện (e.g. '#7DCFFF')
  visible: boolean,        // Bật/tắt hiển thị
  locked: boolean,         // Khóa lớp
  mask: object | null,     // Dữ liệu vùng chọn/mask
  arrows: Array<{          // Mũi tên hướng dòng chảy (tọa độ chuẩn hóa 0..1)
    x1: number, y1: number,
    x2: number, y2: number,
    speed: number
  }>,
  pins: Array<{            // Ghim neo cố định (tọa độ chuẩn hóa 0..1)
    x: number, y: number,
    radius: number
  }>,
  speed: number,           // Tốc độ dòng chảy (0.1 .. 5.0)
  intensity: number,       // Cường độ biến dạng (0.0 .. 3.0)
  direction: number,       // Góc hướng bổ sung (độ)
  feather: number,         // Độ làm mềm viền mask (px)
  maxShift: number,        // Giới hạn độ dịch tối đa (px)
  depth: number            // 0 = xa nhất (ít parallax), 1 = gần nhất (nhiều parallax)
};

MotionConfig = {
  layers: Layer[],
  naturalness: number,     // 0-100: độ tự nhiên (0 = đều đặn, 100 = nhiều biến thiên/nhiễu)
  loopPeriodMs: number,    // Chu kỳ tuần hoàn tính bằng ms (e.g. 4000)
  intensityPreset: 'tinh-te' | 'vua' | 'manh', // Mặc định 'vua'
  parallaxMouse: boolean,  // Bật/tắt parallax theo con trỏ chuột
  advanced: {
    waves: number,         // Số sóng sin (2-3)
    freq: number,          // Tần số cơ bản
    phaseLag: number,      // Độ lệch pha giữa các sóng
    noise: number          // Biên độ nhiễu Perlin/Simplex
  }
};
```

### 3.2. Motion Engine API Contract (Worker B xuất, Worker A gọi)
```javascript
MotionEngine = {
  setConfig(cfg),          // Cập nhật cấu hình toàn cục hoặc từng lớp
  play(),                  // Bắt đầu chạy vòng lặp WebGL
  pause(),                 // Tạm dừng chuyển động
  renderFrame(t),          // Render một khung hình tại thời điểm t
  seamCheck(),             // Chế độ phát chậm để kiểm tra đường nối chu kỳ lặp
  setCompare(ratio),       // ratio: null (tắt) hoặc 0.0..1.0 (vạch chia so sánh Trước / Sau)
  applyToPreview()         // Áp dụng cấu hình chuyển động hiện tại sang Antigravity Preview
};
```
*Nguyên tắc:* Mọi thay đổi từ giao diện (Worker A) đều đi qua `MotionEngine.setConfig(cfg)`. Worker A không tự vẽ hiệu ứng biến dạng WebGL trên canvas.

### 3.3. Pet Events Contract (Worker A triển khai)
```javascript
PetEvents = [
  {
    event: string,         // Một trong 7 sự kiện: 'ai-thinking' | 'user-typing' | 'ai-done' | 'error' | 'idle-long' | 'pet-click' | 'pet-drag'
    state: string,         // Tên state hoạt ảnh: 'idle' | 'walk' | 'sleep' | 'click' | 'drag'
    speech: string,        // Câu thoại bong bóng
    priority: number,      // Độ ưu tiên số (cao hơn ngắt thấp hơn)
    returnAfterMs: number  // Thời gian (ms) trước khi tự động quay về state 'idle'
  }
];
```
*Độ ưu tiên mặc định:* `error` (100) > `ai-thinking` (80) > `user-typing` (60) > `ai-done` (40) > `pet-click` (30) > `pet-drag` (25) > `idle-long` (10).

### 3.4. Event Bus
```javascript
window.StudioEvents.emit(name, data);
window.StudioEvents.on(name, fn);
```
Pet runtime nghe bus này và chuyển state qua `PetRuntime.setState()` hoặc `PetOverlayInstance.setState()`.

---

## 4. Kế Hoạch Chạy Theo Đợt
- [x] **BƯỚC 0**: Tách module, cấu trúc file, khai báo script/css và mount points. BƯỚC 0 XONG.
- [x] **ĐỢT 1**:
  - [x] Worker A (`events-ui-dev`): GIAI ĐOẠN 4 (ĐÃ XONG: Bảng sự kiện 7 event, dropdown state, speech bubble, ưu tiên ngắt 100>80>60>40>30>25>10 không ghi đè, timer tự hồi idle, thanh sim bar 5 nút, cấu trúc Xem sạch & layer list sẵn sàng cho Đợt 2, 8/8 tests pass).
  - [x] Worker B (`motion-engine-dev`): GIAI ĐOẠN 2 - Phần Bộ Máy (ĐÃ XONG: `renderer/motion.js` hoàn chỉnh, WebGL 60FPS, multi-sine wave, seamless loop 0 jerk, anti-tearing, 11/11 tests pass).
- [x] **ĐỢT 2**:
  - [x] Worker A (`events-ui-dev`): GIAI ĐOẠN 2 - Phần Giao Diện (ĐÃ XONG: Danh sách lớp đa tầng, thanh trượt riêng tốc độ/cường độ/hướng, vùng chọn sáng 100% / vùng khác mờ 20%, thay vòng tròn đỏ lớn bằng chấm nhỏ viền mảnh 3.5px, Xem sạch & giữ H ẩn toàn bộ overlay, presets Tóc/Váy/Mây/Suối, Undo/Redo Ctrl+Z/Ctrl+Y, 10/10 tests pass).
  - [x] Worker B (`motion-engine-dev`): GIAI ĐOẠN 3 - Phần Bộ Máy (ĐÃ XONG: `renderer/depth.js` & `renderer/motion.js` hoàn chỉnh với Parallax theo layer.depth, Mouse Parallax [-1..1], gợi ý độ sâu tự động luminance+perspective+saliency, cọ/gradient độ sâu, intensityPreset 0.4x/1.0x/1.8x, setCompare chia đôi vạch cyan, 15/15 tests pass).
- [x] **ĐỢT 3**:
  - [x] Worker A (`events-ui-dev`): GIAI ĐOẠN 3 - Phần Giao Diện (ĐÃ XONG: Chọn cường độ Tinh tế/Vừa/Mạnh, chi tiết sóng trong <details> thu gọn, thanh trượt Độ sâu từng lớp, công tắc Parallax chuột, gợi ý độ sâu tự động & cọ Depth Brush, thanh trượt so sánh Trước/Sau 0..100%, ghép nối hoàn chỉnh MotionEngine & DepthEngine, 12/12 tests pass).
- [ ] **KIỂM TRA TỔNG THỂ & COMMIT**: Coordinator mở app kiểm tra toàn bộ tiêu chí hoàn thành, commit local và báo cáo người dùng duyệt.
