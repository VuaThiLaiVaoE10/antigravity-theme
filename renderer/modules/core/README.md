# Core Module Architecture (EventBus, ProjectState, ModuleManager)

Thư mục nền tảng điều phối kiến trúc mô-đun của Antigravity Theme Studio.

---

## 1. Các Thành Phần Chính

- **`eventBus.js`**:
  Hệ thống Pub/Sub phi tập trung, hỗ trợ đăng ký lắng nghe sự kiện (`on`), phát sự kiện (`emit`), đăng ký 1 lần (`once`), hủy đăng ký (`off`). Hỗ trợ wildcard `*` và ghi lịch sử 100 sự kiện gần nhất cho telemetry.
- **`projectState.js`**:
  Trình quản lý trạng thái dự án bất biến (Immutable State Manager). Mọi module chỉ được đọc dữ liệu snapshot (`get()`) hoặc yêu cầu cập nhật qua `patch(slice, data)`, tự động phát ra sự kiện `state:changed`.
- **`moduleManager.js`**:
  Quản lý vòng đời (`init`, `destroy`) và đăng ký module động theo Open-Closed Principle (OCP).

---

## 2. Đầu Vào & Đầu Ra

### Đầu vào
- Các sự kiện qua `bus.emit(event, payload)`.
- Yêu cầu vá dữ liệu qua `state.patch(slice, partialData)`.

### Đầu ra
- Dữ liệu trạng thái bất biến qua `state.get()`.
- Sự kiện `state:changed` và các sự kiện nghiệp vụ giữa các module.
