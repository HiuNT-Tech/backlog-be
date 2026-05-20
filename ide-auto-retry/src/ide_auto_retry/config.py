"""
Configuration management for IDE Auto-Retry.
Supports config file at ~/.config/ide-auto-retry/config.json
"""

import json
import os
import platform
from pathlib import Path

SYSTEM = platform.system()

# Default configuration
DEFAULTS = {
    "buttons": ["Retry", "Run", "Accept", "Allow", "Yes"],
    "ide_names": [
        "antigravity", "code", "cursor", "electron",
        "Antigravity", "Code", "Cursor",
    ],
    "interval": 1.5,
    "max_depth": 30,
}

# Paths
if SYSTEM == "Windows":
    _APP_DIR = Path(os.environ.get("APPDATA", "~")) / "ide-auto-retry"
    _TEMP = Path(os.environ.get("TEMP", "C:\\Temp"))
else:
    _APP_DIR = Path.home() / ".config" / "ide-auto-retry"
    _TEMP = Path("/tmp")

CONFIG_FILE = _APP_DIR / "config.json"
PIDFILE = _TEMP / "ide-auto-retry.pid"
LOGFILE = _TEMP / "ide-auto-retry.log"

# ANSI color support
ANSI_SUPPORTED = SYSTEM != "Windows" or os.environ.get("WT_SESSION")


class Colors:
    """Terminal color codes."""
    GREEN = "\033[0;32m" if ANSI_SUPPORTED else ""
    RED = "\033[0;31m" if ANSI_SUPPORTED else ""
    YELLOW = "\033[1;33m" if ANSI_SUPPORTED else ""
    CYAN = "\033[0;36m" if ANSI_SUPPORTED else ""
    DIM = "\033[2m" if ANSI_SUPPORTED else ""
    RESET = "\033[0m" if ANSI_SUPPORTED else ""


def load_config() -> dict:
    """Load configuration from file, falling back to defaults."""
    config = dict(DEFAULTS)

    if CONFIG_FILE.exists():
        try:
            with CONFIG_FILE.open("r", encoding="utf-8") as f:
                user_config = json.load(f)
            config.update(user_config)
        except (json.JSONDecodeError, OSError):
            pass

    return config


def save_default_config():
    """Create a default config file if it doesn't exist."""
    if CONFIG_FILE.exists():
        return

    CONFIG_FILE.parent.mkdir(parents=True, exist_ok=True)
    with CONFIG_FILE.open("w", encoding="utf-8") as f:
        json.dump(DEFAULTS, f, indent=2, ensure_ascii=False)
