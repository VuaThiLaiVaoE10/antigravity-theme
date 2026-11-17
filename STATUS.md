# STATUS.md - Antigravity Theme Studio: GIAI ĐOẠN 5 & GIAI ĐOẠN 6

## 1. Trạng Thái Hiện Tại: BƯỚC 0 XONG
- Đã tạo `renderer/pack.js`, `renderer/pack.css` (Worker A).
- Đã tạo `renderer/physics.js`, `renderer/segment.js` (Worker B).
- Đã thêm thẻ `<script>` / `<link>` và các mount point rỗng (`#petPackMount`, `#motionAdvMount`) trong `renderer/index.html`.
- Sau Bước 0: **CHỈ Coordinator** được phép sửa đổi `renderer/index.html` và `renderer/app.js`.

---

## 2. Phân Quyền Sở Hữu File Nghiêm Ngặt
| Thành Viên | File Sở Hữu Được Phép Sửa Đổi |
| :--- | :--- |
| **Worker A (`pack-dev`)** | `renderer/pack.js`, `renderer/pack.css` (và `renderer/motion-ui.js`, `renderer/motion.css` trong Đợt 2) |
| **Worker B (`motion-adv-dev`)** | `renderer/physics.js`, `renderer/segment.js`, và sửa `renderer/motion.js` CHỈ ở điểm gắn physics đã chừa sẵn |
| **Coordinator** | `renderer/index.html`, `renderer/app.js`, `STATUS.md`, `REQUESTS.md`, `BLOCKERS.md` |

*Lưu ý:* Nếu Worker cần sửa file ngoài danh sách hoặc cần thay đổi `index.html`/`app.js`, hãy ghi vào `REQUESTS.md`. Coordinator sẽ xử lý ngay mà Worker không phải chờ.

---

## 3. Hợp Đồng Dữ Liệu (Data Contract)
Cả hai Worker A và B bắt buộc tuân theo hợp đồng dữ liệu sau:

### 3.1. Hợp Đồng Gói Pet (Pet Pack & VSIX Contract)
```javascript
pet.json = {
  schemaVersion: 1,
  name: string,
  speech: string,
  fps: number,
  size: number,
  anchor: { x: number, y: number },
  hitbox: { x: number, y: number, w: number, h: number },
  states: {
    idle: { startFrame: number, endFrame: number, loop: boolean, fps: number },
    walk: { startFrame: number, endFrame: number, loop: boolean, fps: number },
    sleep: { startFrame: number, endFrame: number, loop: boolean, fps: number },
    click: { startFrame: number, endFrame: number, loop: boolean, fps: number },
    drag: { startFrame: number, endFrame: number, loop: boolean, fps: number }
  },
  events: [
    { event: string, state: string, speech: string, priority: number, returnAfterMs: number }
  ],
  frames: [
    "sprites/0001.png",
    "sprites/0002.png"
  ]
};
```
- **Gói pet**: File `.zip` chứa file `pet.json` và thư mục `sprites/` (các file PNG trong suốt).
- **API Worker A xuất**:
  - `PetPack.exportZip(petData) -> Promise<Blob>`
  - `PetPack.importZip(file) -> Promise<PetData>`
  - `PetPack.exportVsix(petData) -> Promise<Blob>`

### 3.2. Hợp Đồng Vật Lý Lớp Chuyển Động (Physics Layer Contract)
Mỗi `Layer` bổ sung thêm trường:
```javascript
Layer.physics = {
  enabled: boolean,          // Bật/tắt mô phỏng vật lý lò xo giảm chấn
  anchor: { x: number, y: number }, // Điểm neo gốc (chuẩn hóa 0..1), ví dụ chân tóc hoặc eo váy
  stiffness: number,         // Độ cứng lò xo (0.1 .. 5.0)
  damping: number,           // Độ giảm chấn (0.1 .. 1.0)
  lag: number                // Độ trễ pha (0.0 .. 1.0), càng xa điểm neo độ trễ càng lớn
};
```
- **API Worker B xuất**:
  - `MotionEngine.setPhysics(layerId, cfg)`
  - `MotionEngine.suggestRegions() -> Promise<Layer[]>`

---

## 4. Kế Hoạch Chạy Theo Đợt
- [x] **BƯỚC 0**: Tạo file, mount point rỗng, cập nhật index.html / app.js, thiết lập STATUS.md. BƯỚC 0 XONG.
- [x] **ĐỢT 1** (Song song): ĐÃ HOÀN THÀNH
  - [x] **Worker A (`pack-dev`)**: GIAI ĐOẠN 5 ĐÃ HOÀN THÀNH (Xuất/Nhập gói pet .zip bảo mật path traversal & schema 1, Khung extension VSIX kèm README minh bạch, test-pet-pack.js pass 8/8 suites 100%). Sẵn sàng cho ĐỢT 2.
  - [x] **Worker B (`motion-adv-dev`)**: GIAI ĐOẠN 6 - Phần Bộ Máy ĐÃ HOÀN THÀNH (Lò xo giảm chấn physics.js, phân đoạn tự động segment.js 0 AI, seamless loop 0 jerk, 8/8 tests pass 100%). Sẵn sàng cho ĐỢT 2.
- [x] **ĐỢT 2**: ĐÃ HOÀN THÀNH
  - [x] **Worker A (`pack-dev`)**: GIAI ĐOẠN 6 - Phần Giao Diện ĐÃ HOÀN THÀNH (Bảng điều khiển Vật lý đàn hồi trong motion-ui.js, nút & Modal "✨ Gợi ý vùng", ghép nối MotionEngine.setPhysics / suggestRegions, test-motion-adv-ui.js pass 5/5 100%).
- [ ] **KIỂM TRA TỔNG THỂ & COMMIT**: Coordinator mở app kiểm tra toàn bộ tiêu chí, commit local và báo cáo chi tiết (phần nào chạy thật, phần nào là khung/hạn chế) rồi DỪNG chờ duyệt.
