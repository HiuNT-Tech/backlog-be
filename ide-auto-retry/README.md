# 🤖 IDE Auto-Retry Tool

Tự động nhấn **Retry, Accept, Allow, Run, Yes** khi dialog error xuất hiện trong **Antigravity / VS Code / Cursor IDE**.

**Cross-platform:** Linux 🐧 | macOS 🍎 | Windows 🪟

## ✨ Tính năng

- 🔄 Tự động click các nút `Retry` / `Accept` / `Allow` / `Run` / `Yes`
- 🖥️ Hỗ trợ đa nền tảng (Linux, macOS, Windows)
- 🔒 **Focus-safe** — không chiếm quyền con trỏ khi đang code (triple-layer restore)
- ⚡ Auto-patch `argv.json` để bật accessibility
- 🛡️ Chống chạy trùng (PID lock)
- 📝 Ghi log chi tiết (auto rotation khi > 1MB)
- 🔧 Hỗ trợ systemd service (Linux)

## 🚀 Cài đặt

### Cách 1: Cài từ Git URL (khuyến nghị)

```bash
pip install git+https://github.com/HiuuNguynn/Tool_AG_Auto_Click.git
```

### Cách 2: Cài từ source (cho dev)

```bash
git clone https://github.com/HiuuNguynn/Tool_AG_Auto_Click.git
cd Tool_AG_Auto_Click

# Editable mode — sửa code sẽ có hiệu lực ngay
pip install -e .

# Hoặc cài trực tiếp
pip install .
```

### Cách 3: Cài từ file wheel

```bash
# Build wheel
pip install build
python -m build

# Share file .whl cho team, team cài bằng:
pip install ide_auto_retry-1.0.0-py3-none-any.whl
```

## 📦 Yêu cầu hệ thống

### Linux
```bash
sudo apt install python3-gi gir1.2-atspi-2.0 xdotool
```

### macOS
- Bật **Accessibility** cho Terminal/IDE trong System Preferences → Security & Privacy → Privacy → Accessibility

### Windows
- Không cần cài thêm gì

## 🎮 Sử dụng

Sau khi cài đặt, dùng lệnh `auto-retry`:

```bash
# Chạy bình thường (foreground)
auto-retry

# Chạy background (Linux/macOS)
auto-retry --daemon

# Scan only, không click
auto-retry --dry-run

# Dừng instance đang chạy
auto-retry --stop

# Tùy chỉnh interval và buttons
auto-retry --interval 2.0 --buttons Retry Accept

# Xem trạng thái
auto-retry --status

# Verbose mode
auto-retry -v
```

### Systemd Service (Linux)

```bash
# Cài systemd user service (auto-start khi login)
auto-retry --install-service

# Gỡ service
auto-retry --uninstall-service
```

## ⚙️ Cấu hình

Tạo file `~/.config/ide-auto-retry/config.json`:

```json
{
    "buttons": ["Retry", "Run", "Accept", "Allow", "Yes"],
    "interval": 1.5,
    "ide_names": ["antigravity", "code", "cursor"],
    "log_file": "~/.local/share/ide-auto-retry/auto-retry.log"
}
```

## 🔧 Standalone Script

Nếu không muốn cài package, dùng file standalone:

```bash
# Copy file auto-retry-core.py vào project
python3 auto-retry-core.py

# Với options
python3 auto-retry-core.py --dry-run
python3 auto-retry-core.py --stop
```

## ❓ Troubleshooting

### Linux: "AT-SPI2 unavailable"
```bash
sudo apt install python3-gi gir1.2-atspi-2.0
```

### IDE không được detect
Restart IDE sau khi cài tool (cần restart để `force-renderer-accessibility` có hiệu lực).

### Nút không được click
Chạy `auto-retry --dry-run` để kiểm tra tool có tìm thấy nút không.

### Focus bị mất (Linux)
Cài `xdotool` để bật triple-layer focus restore:
```bash
sudo apt install xdotool
```

## 📄 License

MIT
