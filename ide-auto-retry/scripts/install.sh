#!/bin/bash
# ============================================================
# IDE Auto-Retry — Quick Install Script
# Dùng cho team nội bộ: chỉ cần chạy 1 dòng lệnh.
#
# Usage:
#   curl -sSL <raw-url>/scripts/install.sh | bash
#   # hoặc
#   bash install.sh
# ============================================================

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

info()  { echo -e "${GREEN}[✓]${NC} $1"; }
warn()  { echo -e "${YELLOW}[⚠]${NC} $1"; }
error() { echo -e "${RED}[✗]${NC} $1"; }

OS=$(uname -s)
echo ""
echo -e "${GREEN}🤖 IDE Auto-Retry — Installer${NC}"
echo "============================================"
echo ""

# 1. Check Python
if ! command -v python3 &>/dev/null; then
    error "Python 3 is required but not installed."
    exit 1
fi
info "Python 3 found: $(python3 --version)"

# 2. Install system dependencies (Linux)
if [ "$OS" = "Linux" ]; then
    echo ""
    info "Installing system dependencies..."
    if command -v apt &>/dev/null; then
        sudo apt update -qq
        sudo apt install -y -qq python3-gi gir1.2-atspi-2.0 xdotool 2>/dev/null || true
        info "AT-SPI2 + xdotool installed"
    elif command -v dnf &>/dev/null; then
        sudo dnf install -y python3-gobject at-spi2-core xdotool 2>/dev/null || true
        info "AT-SPI2 + xdotool installed"
    elif command -v pacman &>/dev/null; then
        sudo pacman -S --noconfirm python-gobject at-spi2-core xdotool 2>/dev/null || true
        info "AT-SPI2 + xdotool installed"
    else
        warn "Unknown package manager. Please install: python3-gi, gir1.2-atspi-2.0, xdotool manually."
    fi
fi

# 3. Install the package
echo ""
info "Installing ide-auto-retry..."

# Try to find the repo root (if running from within the repo)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(dirname "$SCRIPT_DIR")"

if [ -f "$REPO_DIR/pyproject.toml" ]; then
    # Installing from local repo
    pip install --user "$REPO_DIR" 2>/dev/null || pip3 install --user "$REPO_DIR"
    info "Installed from local source"
else
    # Installing from git
    REPO_URL="${REPO_URL:-https://github.com/HiuNT-Tech/ide-auto-retry.git}"
    pip install --user "git+$REPO_URL" 2>/dev/null || pip3 install --user "git+$REPO_URL"
    info "Installed from git"
fi

# 4. Verify installation
echo ""
if command -v auto-retry &>/dev/null; then
    info "Installation successful! ✨"
    echo ""
    echo -e "  ${GREEN}auto-retry${NC}              — Start monitoring"
    echo -e "  ${GREEN}auto-retry --daemon${NC}     — Run in background"
    echo -e "  ${GREEN}auto-retry --dry-run${NC}    — Test mode (scan only)"
    echo -e "  ${GREEN}auto-retry --stop${NC}       — Stop monitoring"
    echo -e "  ${GREEN}auto-retry --status${NC}     — Check status"
    echo ""

    # Offer to install systemd service
    if [ "$OS" = "Linux" ]; then
        read -p "Install auto-start service? (y/N) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            auto-retry --install-service
        fi
    fi
else
    warn "auto-retry command not in PATH."
    warn "Try: export PATH=\"\$HOME/.local/bin:\$PATH\""
    warn "Then add that line to your ~/.bashrc or ~/.zshrc"
fi

echo ""
info "Done! 🎉"
echo ""
