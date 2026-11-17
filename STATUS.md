# STATUS.md - Antigravity Theme Studio: THEME ĐỘNG THEO LỚP (LAYER MOTION ENGINE)

## 1. Trạng Thái Hiện Tại: ĐÃ DUYỆT KẾ HOẠCH & BƯỚC 1 HOÀN TẤT
- Đã chạy 100% toàn bộ 27 bộ test suite hiện có của dự án: Tất cả đều **PASS (100%)**.
- Đã ghi nhận 3 quyết định kiến trúc: **D-007**, **D-008**, **D-009** vào `DECISIONS.md`.
- Phần Pet đã hoàn thành và **ĐÓNG BĂNG** (không đụng vào).
- Sẵn sàng nạp thẻ việc **C0 (config.js)** từ User để triển khai.

---

## 2. Các Quyết Định Kiến Trúc Cốt Lõi Đã Duyệt (DECISIONS.md)
| Mã | Nội Dung Quyết Định | Ràng Buộc Kỹ Thuật |
| :--- | :--- | :--- |
| **D-007** | Tích hợp Neo đàn hồi (`physics.js`) | Mặc định TẮT cho lớp mới. `maxDisplacement` đổi sang ‰ và kẹp bằng `CFG`. Tổng dịch chuyển kẹp bằng $\tanh$. Tắt vật lý khi kiểm tra vòng lặp/xuất video. |
| **D-008** | Vùng an toàn (Safe Zone) bảo vệ chữ đọc | Tự động đo tọa độ thực từ Live Preview (`#previewChat`, `#composerInput`, `#sidebar`). Viền mềm dùng `CFG.safe.featherPermille`. Có công tắc ẩn/hiện và cho phép kéo chỉnh. |
| **D-009** | Làm dịu chuyển động khi đang gõ (`CFG.calm`) | Tự động giảm biên độ còn 20% khi gõ phím, phục hồi sau 3s. Toàn bộ thông số nội suy, mức giảm và thời gian hồi lấy từ `CFG.calm`, không số cứng. |

---

## 3. Phân Quyền Sở Hữu File & Mô-đun (Theme Động)
| Thành Viên | File Sở Hữu | Trách Nhiệm Chính |
| :--- | :--- | :--- |
| **Worker 1 (`core-engine-dev`)** | `renderer/config.js`, `renderer/motion.js`, `renderer/safezone.js`, `renderer/fatigue.js` | Nguồn sự thật CFG, 4 kiểu chuyển động theo lớp (Thở/Đung đưa/Trôi/Gợn), Vùng an toàn, Đồng hồ tải mắt |
| **Worker 2 (`canvas-tools-dev`)** | `renderer/layers.js`, `renderer/viewport.js`, `renderer/selection.js`, `renderer/cut.js`, `renderer/retouch.js`, `renderer/undo.js`, `renderer/project-io.js` | Quản lý lớp, Viewport pan/zoom, Công cụ chọn (Wand/Brush/Lasso), Cắt lớp, Lấp nền khuất, Hoàn tác 50 bước / 200MB, Lưu/nạp .tszip |
| **Worker 3 (`ui-motion-dev`)** | `renderer/motion-ui.js`, `renderer/motion.css` | Bảng điều khiển lớp động, thanh trượt biên độ ‰, nút kiểm tra vòng lặp, hiển thị đồng hồ tải mắt |
| **Reviewer (`reviewer`)** | Chỉ đọc code, không viết tính năng | Chạy prompt kiểm duyệt theo `cards/R1.md`, thẩm định 0 số cứng / 0 hàm rỗng / 0 test giả. Chỉ trả ĐẠT thì thẻ mới tính xong |
| **Coordinator** | `renderer/index.html`, `renderer/app.js`, `STATUS.md`, `DECISIONS.md`, `test/test-all-runner.js` | Điều phối Swarm, điều phối bus sự kiện, chạy nghiệm thu tổng thể |

---

## 4. Nhật Ký Tiến Độ Các Thẻ Việc
- [x] **BƯỚC 0 & BƯỚC 1**: Khảo sát hiện trạng, phân tích chồng lấn vật lý tóc, duyệt kế hoạch, chạy 100% test dự án, lập `DECISIONS.md`. **HOÀN TẤT**.
- [x] **Thẻ C0 (`config.js`)**: Nạp đầu tiên, `deepFreeze(CFG)` v2, đơn vị ‰ (`ampPx(type, amp)`). **HOÀN TẤT** (28/28 test PASS).
- [x] **GIAI ĐOẠN 2 (Động cơ chuyển động mềm cho từng lớp)**:
  - 4 Kiểu chuyển động: Thở (`breathe`), Đung đưa (`sway`), Trôi (`drift`), Gợn (`ripple`).
  - Đơn vị ‰ chuẩn hóa từ `CFG.motion.limit`, kẹp biên độ mượt bằng $\tanh$ theo D-007.
  - Điểm neo (Pivot/Anchor) cho từng lớp: Gốc neo cố định (0 dịch chuyển ở Sway/Thở), ngọn dao động tự do.
  - Vòng lặp liền mạch 0 Jerk: tuần hoàn hoàn hảo $f(0) \equiv f(T)$ và $f'(0) \equiv f'(T)$, nhiễu tròn Simplex 2D.
  - Cảnh báo "Dễ gây rối mắt" tự động bật khi biên độ vượt 75% ngưỡng khuyến nghị (`CFG.motion.warnRatio`).
  - Nút "Kiểm tra vòng lặp" (`seamCheck()`) kiểm tra điểm nối 0s/12s và báo 0 nhảy khung.
  - 29/29 bài test toàn dự án đạt **100% PASS (0 FAIL)**.
- [x] **GIAI ĐOẠN 3 (Quản lý mức chuyển động để không rối mắt)**:
  - **A. Giới hạn điểm nhấn (Focal Point Limiting) & Thước đo Tải mắt**:
    - Tối đa 3 vùng/lớp chuyển động cùng lúc (`CFG.load.maxActive: 3`). Nếu vượt quá thì hiện dải thông báo cảnh báo `⚠️ Quá nhiều điểm nhấn` kèm nút bấm tự động tắt bớt lớp thừa (`reduceExcessLayers()`).
    - Chỉ số "Tải mắt" (Visual Load): $\sum (\text{amplitude}_i \times \text{speed}_i)$ hiển thị trực quan dạng thước đo gauge và huy hiệu màu: 🟢 Xanh (Dịu mắt $\le 1.5$), 🟡 Vàng (Vừa phải $\le 3.0$), 🔴 Đỏ (Rối mắt $> 3.0$) theo đúng `CFG.load`.
  - **B. Vùng an toàn (Safe Zone) cho chữ và khung chat (D-008 & CFG.safe)**:
    - Đo đạc động tọa độ thực tế từ Live Preview: Thanh bên (`#previewSidebar`), Khung chat (`#previewChat`), Ô nhập lệnh (`#previewComposer`), và Vùng code (`.code-snippet-body`). Tuyệt đối không hardcode tọa độ.
    - Làm mềm viền chuyển tiếp bằng `CFG.safe.featherPermille` (12‰).
    - Tự động suy giảm biên độ chuyển động nền dưới vùng an toàn xuống còn 20% (`CFG.calm.typingFactor: 0.2`) hoặc đóng băng hoàn toàn (`freeze` mode), kèm tùy chọn làm mờ nhẹ nền (`blurFocus`).
    - Chuyển động nền mạnh nhất chỉ nằm ở rìa và vùng trống ngoài vùng an toàn.
    - Cung cấp công tắc Bật/Tắt hiển thị Vùng an toàn và cho phép người dùng kéo chỉnh vị trí.
  - **C. Focus Shield (Làm dịu khi gõ phím - D-009 & CFG.calm)**:
    - Tự động phát hiện khi người dùng đang gõ phím (`keydown`/`input`) trong ô nhập hoặc toàn app, lập tức hạ biên độ toàn bộ chuyển động nền xuống 20%.
    - Khi người dùng dừng gõ sau 3 giây (`CFG.calm.recoverMs: 3000`), biên độ nhẹ nhàng hồi phục dần về 100% theo hàm mũ mượt mà $\tau = 0.5$ (`CFG.calm.tau`).
    - Có công tắc Bật/Tắt `Focus Shield` trong bảng điều khiển.
  - **Kiểm thử**: Viết mới `test/test-safezone-calm.js`, tích hợp vào bộ chạy tập trung `test/test-all-runner.js`: **30/30 PASS (100.0%)**. Tiêu chí hoàn thành đạt: chữ và code trong Live Preview hoàn toàn sắc nét, dễ đọc, không bị nền động làm xao nhãng.
- [x] **KIẾN TRÚC MÔ-ĐUN ĐA AGENT (GIAI ĐOẠN 4 PREP)**:
  - **Hợp đồng & Đặc tả**:
    - `docs/contracts/project-state.schema.json`: Schema chuẩn mô tả toàn bộ state (lớp, mask, chuyển động, cài đặt).
    - `docs/contracts/events.md`: Catalog sự kiện Event Bus phân quyền cho các agent song song.
    - `docs/contracts/module-spec.md`: Quy chuẩn giao diện Module Interface và bảo vệ chống sửa chéo state.
  - **Tầng Core Độc Lập (`renderer/modules/core/`)**:
    - `eventBus.js`: Pub/Sub phi tập trung, hỗ trợ wildcard và telemetry.
    - `projectState.js`: Trình quản lý trạng thái bất biến, ngăn ngừa đột biến trực tiếp (Immutable State Manager).
    - `moduleManager.js`: Đăng ký và nạp/gỡ module động theo Open-Closed Principle (OCP).
  - **3 Mô-đun Chuyên Biệt**:
    1. `renderer/modules/parallax/`: Parallax dịch theo chuột theo chiều sâu (`depth`), làm mượt bằng Lerp exponential, bật/tắt an toàn.
    2. `renderer/modules/calm/`: Quản lý 3 mức Tinh tế / Vừa / Sống động theo `CFG.presets`, tự giảm tải 20% khi window blur / mất tiêu điểm.
    3. `renderer/modules/export-compare/`: Giữ so sánh trước/sau (hold/split), xem chậm slow-mo 0.25x-2x, xuất video WebM/MP4/APNG tuần hoàn.
  - **Tiêu Chí Hoàn Thành (OCP)**: Thử nghiệm nạp module thứ 4 (`ambient-particles`) động mà **không phải sửa dù chỉ 1 ký tự code của module cũ**.
  - **Kiểm thử**: Viết mới `test/test-modular-architecture.js`, tích hợp vào bộ chạy tập trung: **31/31 PASS (100.0%)**.
- [x] **THẺ C1 (Đổi biên độ sang ‰ & Thay số cứng bằng CFG)**:
  - **C1-a (`motion.js`)**: Thay `MOTION_LIMITS = CFG.motion.limit`, `LOOP = { seconds: CFG.loop.seconds }`. Thay nguyên văn các hàm: `defaultMotion`, `layerTransform`, `motionVector`, `drawLayerMotion`, `setMotion`. Cập nhật giao diện `motion-ui.js` sang nhãn ‰ (`amp * unitPx()`), cảnh báo vàng `warnRatio`, chu kỳ từ `CFG.loop`.
  - **C1-b (Các file module)**: `calm.js` (`Calm`, `LOAD_THRESH`, `MAX_ACTIVE`, `eyeLoadFrom`), `safe.js` (`Safe.feather = CFG.safe.featherPermille`, `safeSlice`), `parallax.js` (`Parallax`, `parallaxOffset`, `ParallaxProvider`), `calm-presets.js` (`CALM_PRESETS`, `CalmPreset`, `applyCalmPreset`), `undo.js` (`CFG.undo`), `layers.js` (`CFG.image.maxSide`).
  - **C1-c (`project-io.js`)**: Di chuyển dữ liệu v1 sang v2 (`migrateMeta(m)`), lưu dự án chuẩn `version: CFG.version`, xác thực phiên bản.
  - **C1-d (Kiểm thử & Khử số cứng)**: Quét regex `2048|maxSteps: [0-9]|200 \* 1024|seconds: [0-9]|MAX_ACTIVE = [0-9]|green: [0-9]|maxPx|Math\.min\(16` trên toàn bộ mã nguồn: **KẾT QUẢ RỖNG (0 matches)**.
  - **Kiểm thử**: Đạt 9/9 PASS trong `test/test-card-c1.js`. Chạy tập trung toàn dự án: **32/32 PASS (100.0%)**.
- [x] **THẺ T1 (Bộ chạy test trong app `tests.js` & Panel Kiểm thử)**:
  - **Cấu trúc lõi**: `Tests = { results: [], running: false }`, `snapGlobals`, `restoreGlobals`, `discoverTests`, `runAllTests`, `testReport`, `selfCheckRunner`. Chép nguyên văn 100%.
  - **Quản lý REQUIRED_TESTS**: Đã tích hợp danh sách 22 bài test từ các thẻ hoàn tất (`testConfig`, `testLayers`, `testView`, `testUndo`, `testWand`, `testBrush`, `testLasso`, `testMorph`, `testCut`, `testClone`, `testFill`, `testReveal`, `testZip`, `testSaveLoad`, `testMigrate`, `testMotion`, `testUnits`, `testSetMotion`, `testLoad`, `testSafe`, `testParallax`, `testPresets`).
  - **Giao diện panel "Kiểm thử"**: Tab `Kiểm thử` trên `tabs-nav`, nút "Chạy tất cả test" kèm hộp thoại xác nhận bảo lưu dự án, nút "Sao chép báo cáo" vào clipboard, vùng `<pre>` hiển thị báo cáo tô màu ngữ nghĩa (PASS xanh lá, FAIL/THIẾU đỏ, KHÔNG KẾT LUẬN vàng).
  - **Kiểm thử**: `selfCheckRunner()` đạt **PASS runner**. `runAllTests()` đạt **22/22 PASS (100.0%)**. Chạy tập trung toàn bộ dự án: **33/33 PASS (100.0%)**.
