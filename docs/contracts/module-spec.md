# Đặc Tả Kiến Trúc Mô-đun Độc Lập (Module Architecture Specification)

## 1. Nguyên Tắc Cốt Lõi (Core Principles)

1. **Tính Độc Lập Tuyệt Đối (Loose Coupling & High Cohesion)**:
   Mỗi mô-đun nằm trong thư mục riêng của mình, sở hữu logic nội bộ độc lập. Tuyệt đối không import hoặc gọi trực tiếp method của mô-đun khác (`no cross-imports`).

2. **Giao Tiếp Bất Biến (Message-Passing & Immutable State)**:
   Mọi giao tiếp đều thông qua 2 đối tượng được cung cấp lúc khởi tạo:
   - `context.bus`: Event Bus trung tâm (`on`, `off`, `emit`, `once`).
   - `context.state`: Trình quản lý trạng thái dự án (`get()`, `patch(slice, value)`).

3. **Nguyên Tắc Đóng/Mở (Open-Closed Principle)**:
   Để thêm tính năng mới (Module 4, 5, 6...), agent chỉ cần tạo thư mục mô-đun mới và đăng ký vào `ModuleManager`. **Không được chỉnh sửa bất kỳ dòng code nào trong các mô-đun đã có.**

---

## 2. Giao Diện Chuẩn Của Một Mô-đun (Module Interface)

Mỗi mô-đun phải xuất khẩu một object hoặc class tuân theo interface sau:

```javascript
module.exports = {
  // 1. Định danh duy nhất (kebab-case)
  id: 'my-feature-module',

  // 2. Tên hiển thị người dùng / log
  name: 'Tên Tính Năng',

  // 3. Phiên bản
  version: '1.0.0',

  // 4. Hàm khởi tạo vòng đời: Nhận context từ ModuleManager
  init(context) {
    const { bus, state, config } = context;

    // Lắng nghe sự kiện
    this.unsubscribe = bus.on('my:event', (payload) => {
      // Xử lý logic...
    });
  },

  // 5. Hàm hủy dọn dẹp tài nguyên (khi gỡ module)
  destroy() {
    if (this.unsubscribe) this.unsubscribe();
  }
};
```

---

## 3. Quy Trình Làm Việc Đa Agent Song Song (Multi-Agent Workflow)

1. **Đọc Hợp Đồng**: Agent đọc `project-state.schema.json` và `events.md`.
2. **Triển Khai Độc Lập**: Agent tạo thư mục `renderer/modules/<tên-module>/` gồm:
   - `index.js`: Mã nguồn tính năng tuân thủ Module Interface.
   - `README.md`: Tài liệu ngắn mô tả đầu vào, đầu ra, sự kiện lắng nghe/phát.
3. **Đăng Ký Vào Core**:
   ```javascript
   const ModuleManager = require('../core/moduleManager.js');
   ModuleManager.register(myNewModule);
   ```
4. **Viết Kiểm Thử**: Viết unit test cô lập cho module trong `test/`.
