# Hợp Đồng Sự Kiện Hệ Thống (System Event Bus Catalog)

Tài liệu quy định danh mục sự kiện trung tâm (Event Bus) của Antigravity Theme Studio.
Tất cả các mô-đun phát triển song song bởi các agent bắt buộc phải giao tiếp thông qua các sự kiện này, **tuyệt đối không được gọi hàm nội bộ hoặc sửa trực tiếp biến state của mô-đun khác**.

---

## 1. Trạng Thái Dự Án (State Lifecycle Events)

### `state:changed`
- **Người phát (Emitter)**: `ProjectStateManager`
- **Mục đích**: Thông báo khi có bất kỳ lát cắt dữ liệu (slice) nào trong Project State được cập nhật.
- **Payload**:
  ```json
  {
    "slice": "layers" | "settings.parallax" | "settings.calm" | "image" | "*",
    "oldValue": { ... },
    "newValue": { ... },
    "timestamp": 1731826000000
  }
  ```

### `state:patch`
- **Người phát (Emitter)**: Mọi mô-đun
- **Người nhận (Receiver)**: `ProjectStateManager`
- **Mục đích**: Yêu cầu cập nhật một lát cắt dữ liệu một cách an toàn.
- **Payload**:
  ```json
  {
    "slice": "settings.parallax",
    "patch": { "enabled": true }
  }
  ```

---

## 2. Mô-đun Parallax (Mouse 3D Parallax Events)

### `mouse:move`
- **Người phát**: Window / Viewport / UI Layer
- **Người nhận**: `ParallaxModule`
- **Payload**:
  ```json
  {
    "normX": 0.25,     // Chuẩn hóa -1.0 .. 1.0 (tâm là 0,0)
    "normY": -0.15,
    "clientX": 450,
    "clientY": 320
  }
  ```

### `parallax:toggle`
- **Người phát**: UI Controls / Shortcuts
- **Người nhận**: `ParallaxModule`
- **Payload**:
  ```json
  {
    "enabled": true
  }
  ```

### `parallax:calculated`
- **Người phát**: `ParallaxModule`
- **Người nhận**: Renderers (Canvas 2D, WebGL Shaders)
- **Mục đích**: Cung cấp vector dịch chuyển đã làm mượt (lerp) cho từng lớp dựa theo độ sâu (`depth`).
- **Payload**:
  ```json
  {
    "rawMouse": { "x": 0.25, "y": -0.15 },
    "smoothedMouse": { "x": 0.21, "y": -0.12 },
    "layerShifts": {
      "layer-hair-1": { "dx": 2.4, "dy": -1.3, "depth": 0.85 },
      "layer-clouds": { "dx": 0.3, "dy": -0.1, "depth": 0.10 }
    }
  }
  ```

---

## 3. Mô-đun Độ Êm (Calm & Focus Protection Events)

### `calm:set-preset`
- **Người phát**: UI Preset Pills / Settings
- **Người nhận**: `CalmModule`
- **Payload**:
  ```json
  {
    "preset": "subtle" | "medium" | "lively"
  }
  ```

### `window:focus-change`
- **Người phát**: Window listener (`window.onfocus`, `window.onblur`, `document.onvisibilitychange`)
- **Người nhận**: `CalmModule`
- **Payload**:
  ```json
  {
    "focused": false,
    "attenuation": 0.2
  }
  ```

### `calm:limits-enforced`
- **Người phát**: `CalmModule`
- **Người nhận**: Motion UI / Visual Load Meter
- **Payload**:
  ```json
  {
    "preset": "subtle",
    "maxAmpPermille": 1.0,
    "maxActive": 2,
    "mutedLayers": ["layer-3"]
  }
  ```

---

## 4. Mô-đun So Sánh & Xuất (Export & Compare Events)

### `compare:ratio`
- **Người phát**: Split Screen Slider / UI
- **Người nhận**: Render Engine, `ExportCompareModule`
- **Payload**:
  ```json
  {
    "ratio": 0.5   // null = tắt so sánh, 0.0 .. 1.0 = vị trí vạch chia
  }
  ```

### `compare:hold`
- **Người phát**: Phím Space / Chuột giữ
- **Người nhận**: Render Engine
- **Payload**:
  ```json
  {
    "holding": true  // true = hiện 100% ảnh gốc tĩnh; false = quay lại ảnh động
  }
  ```

### `playback:rate`
- **Người phát**: Slow-motion selector
- **Người nhận**: Playback Engine
- **Payload**:
  ```json
  {
    "rate": 0.25 | 0.5 | 1.0 | 2.0
  }
  ```

### `export:start`
- **Người phát**: UI Nút Xuất Video
- **Người nhận**: `ExportCompareModule`
- **Payload**:
  ```json
  {
    "format": "webm" | "mp4" | "apng",
    "fps": 30 | 60,
    "loopDurationSec": 12
  }
  ```

### `export:progress`
- **Người phát**: `ExportCompareModule`
- **Người nhận**: UI Modal Tiến Trình
- **Payload**:
  ```json
  {
    "currentFrame": 180,
    "totalFrames": 360,
    "percent": 50.0
  }
  ```

### `export:done`
- **Người phát**: `ExportCompareModule`
- **Người nhận**: File saver / Notifier
- **Payload**:
  ```json
  {
    "format": "webm",
    "totalFrames": 360,
    "durationSec": 12,
    "blobSize": 2450120
  }
  ```
