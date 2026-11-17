# Mô-đun Độ Êm & Bảo Vệ Tập Trung (Calm & Visual Protection Module)

Mô-đun phụ trách quản lý 3 mức chuyển động (Tinh tế, Vừa, Sống động) và tự động làm dịu/giảm tải khi cửa sổ không được chọn.

---

## 1. Ba Mức Chuyển Động (CFG.presets)
- **Tinh tế (`subtle`)**: Biên độ tối đa 1‰, tối đa 2 lớp động, chu kỳ 14s, nhiễu hỗn loạn tối đa 0.10.
- **Vừa (`medium` - Mặc định)**: Biên độ tối đa 2‰, tối đa 3 lớp động, chu kỳ 12s, nhiễu hỗn loạn tối đa 0.20.
- **Sống động (`lively`)**: Biên độ tối đa 3‰, tối đa 4 lớp động, chu kỳ 9s, nhiễu hỗn loạn tối đa 0.35.

---

## 2. Tự Giảm Khi Cửa Sổ Mất Tiêu Điểm
- Tự động bắt sự kiện `window.onblur` / `document.hidden`.
- Khi người dùng chuyển sang cửa sổ khác: Lập tức hạ biên độ/tốc độ xuống 20% (hệ số 0.2x) để tiết kiệm pin/CPU và không gây xao nhãng ngoại vi.
- Khi quay lại cửa sổ: Êm dịu phục hồi về 100%.

---

## 3. Hợp Đồng Đầu Vào & Đầu Ra

### Đầu vào
- `calm:set-preset`: Thay đổi mức (`subtle`, `medium`, `lively`).
- `window:focus-change`: Cập nhật trạng thái tiêu điểm cửa sổ.

### Đầu ra
- `calm:preset-applied`: Thông báo mức đã áp dụng kèm danh sách các lớp bị kẹp/ẩn.
- `calm:attenuation-changed`: Hệ số suy giảm nền khi cửa sổ bị mất tiêu điểm.

### Sự Kiện
- **Lắng nghe**: `calm:set-preset`, `window:focus-change`, `state:changed`.
- **Phát ra**: `calm:preset-applied`, `calm:attenuation-changed`.
