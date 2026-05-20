"""
Systemd user service installer/uninstaller for IDE Auto-Retry.
Allows auto-starting on login (Linux only).
"""

import platform
import shutil
import subprocess
from pathlib import Path

from .core import log

SYSTEM = platform.system()

SERVICE_NAME = "ide-auto-retry"
SERVICE_FILE = Path.home() / ".config" / "systemd" / "user" / f"{SERVICE_NAME}.service"

SERVICE_TEMPLATE = """[Unit]
Description=IDE Auto-Retry — auto-click Retry/Accept/Allow buttons
Documentation=https://github.com/HiuNT-Tech/ide-auto-retry
After=graphical-session.target

[Service]
Type=simple
ExecStart={exec_path}
Restart=on-failure
RestartSec=5
Environment=DISPLAY=:0

[Install]
WantedBy=default.target
"""


def install_service():
    """Install systemd user service for auto-start on login."""
    if SYSTEM != "Linux":
        log("Systemd service is only supported on Linux.", "warn")
        return False

    # Find the auto-retry executable
    exec_path = shutil.which("auto-retry")
    if not exec_path:
        log("auto-retry command not found in PATH. Install the package first.", "err")
        return False

    # Create service file
    SERVICE_FILE.parent.mkdir(parents=True, exist_ok=True)
    content = SERVICE_TEMPLATE.format(exec_path=exec_path)
    SERVICE_FILE.write_text(content, encoding="utf-8")

    # Enable and start
    try:
        subprocess.run(["systemctl", "--user", "daemon-reload"],
                       capture_output=True, check=True)
        subprocess.run(["systemctl", "--user", "enable", SERVICE_NAME],
                       capture_output=True, check=True)
        subprocess.run(["systemctl", "--user", "start", SERVICE_NAME],
                       capture_output=True, check=True)
        log(f"Service installed and started: {SERVICE_FILE}", "ok")
        log("Auto-retry will now start automatically on login.", "ok")
        return True
    except subprocess.CalledProcessError as e:
        log(f"Failed to enable service: {e}", "err")
        return False


def uninstall_service():
    """Remove systemd user service."""
    if SYSTEM != "Linux":
        log("Systemd service is only supported on Linux.", "warn")
        return False

    try:
        subprocess.run(["systemctl", "--user", "stop", SERVICE_NAME],
                       capture_output=True)
        subprocess.run(["systemctl", "--user", "disable", SERVICE_NAME],
                       capture_output=True)
        if SERVICE_FILE.exists():
            SERVICE_FILE.unlink()
        subprocess.run(["systemctl", "--user", "daemon-reload"],
                       capture_output=True)
        log("Service removed successfully.", "ok")
        return True
    except Exception as e:
        log(f"Failed to remove service: {e}", "err")
        return False


def service_status():
    """Check if the systemd service is running."""
    if SYSTEM != "Linux":
        return None

    try:
        r = subprocess.run(
            ["systemctl", "--user", "is-active", SERVICE_NAME],
            capture_output=True, text=True
        )
        return r.stdout.strip()
    except Exception:
        return None
