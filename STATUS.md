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
- [ ] **GIAI ĐOẠN 3 (Parallax độ sâu & So sánh trước/sau)**: Tách ảnh, lớp động, vùng an toàn Live Preview.
- [ ] **Thẻ Chống Rối Mắt**: Vùng an toàn Live Preview, Đồng hồ tải mắt, Focus Shield (`CFG.calm`).
