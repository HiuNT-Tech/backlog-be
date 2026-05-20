#!/usr/bin/env python3
"""
CLI entry point for IDE Auto-Retry.

Usage:
    auto-retry                    # run in foreground
    auto-retry --daemon           # run as background daemon
    auto-retry --dry-run          # scan only, don't click
    auto-retry --stop             # stop running instance
    auto-retry --status           # show current status
    auto-retry --install-service  # install systemd user service
"""

import argparse
import os
import platform
import signal
import subprocess
import sys
import time

from . import __version__
from .config import (
    Colors as C,
    PIDFILE,
    load_config,
    save_default_config,
    SYSTEM,
)
from .core import ensure_accessibility, check_focus_tools, log, scan


def write_pid():
    """Write current PID to lock file."""
    PIDFILE.write_text(str(os.getpid()))


def cleanup_pid():
    """Remove PID lock file."""
    try:
        PIDFILE.unlink(missing_ok=True)
    except Exception:
        pass


def stop_existing():
    """Stop a running instance by PID."""
    if not PIDFILE.exists():
        log("No running instance found.", "warn")
        return

    try:
        pid = int(PIDFILE.read_text().strip())
        os.kill(pid, signal.SIGTERM)
        log(f"Stopped PID {pid}", "ok")
    except (ProcessLookupError, ValueError):
        log("Instance already stopped.", "warn")
    except PermissionError:
        log(f"Permission denied to stop PID. Try: kill {PIDFILE.read_text().strip()}", "err")
    cleanup_pid()


def check_duplicate():
    """Prevent duplicate instances."""
    if not PIDFILE.exists():
        return

    try:
        pid = int(PIDFILE.read_text().strip())
        os.kill(pid, 0)  # Check if process exists
        log(f"Already running (PID {pid}). Use 'auto-retry --stop' first.", "err")
        sys.exit(1)
    except (ProcessLookupError, ValueError):
        cleanup_pid()


def show_status():
    """Show current status of auto-retry."""
    from .service import service_status

    if PIDFILE.exists():
        try:
            pid = int(PIDFILE.read_text().strip())
            os.kill(pid, 0)
            log(f"Running (PID {pid})", "ok")
        except (ProcessLookupError, ValueError):
            log("PID file exists but process not running.", "warn")
            cleanup_pid()
    else:
        log("Not running.", "info")

    svc = service_status()
    if svc:
        log(f"Systemd service: {svc}", "info")


def daemonize():
    """Fork into background (Unix only)."""
    if SYSTEM == "Windows":
        log("Daemon mode not supported on Windows. Use --install-service instead.", "warn")
        return

    pid = os.fork()
    if pid > 0:
        # Parent — print info and exit
        log(f"Daemonized with PID {pid}", "ok")
        sys.exit(0)

    # Child — detach
    os.setsid()
    # Redirect stdio to /dev/null
    devnull = os.open(os.devnull, os.O_RDWR)
    os.dup2(devnull, 0)
    os.dup2(devnull, 1)
    os.dup2(devnull, 2)
    os.close(devnull)


def run_loop(config, args):
    """Main monitoring loop."""
    buttons = args.buttons or config["buttons"]
    ide_names = config["ide_names"]
    interval = args.interval or config["interval"]
    max_depth = config.get("max_depth", 30)

    clicks = 0
    scans_count = 0
    ide_ok = False

    while True:
        scans_count += 1
        r = scan(buttons, ide_names, args.dry_run, args.verbose, max_depth)

        if r >= 0 and not ide_ok:
            log("IDE detected, monitoring...", "ok")
            ide_ok = True
        elif r == -1 and ide_ok:
            log("IDE disconnected, waiting...", "warn")
            ide_ok = False

        if r == 1:
            clicks += 1
            log(f"✅ Auto-clicked! (total: {clicks})", "ok")
            time.sleep(1.5)  # Wait for dialog to close

        if args.once:
            break

        if scans_count % 60 == 0:
            log(f"Still monitoring... scans={scans_count}, clicks={clicks}", "dbg")

        time.sleep(interval)

    log(f"Done. scans={scans_count} clicks={clicks}")
    cleanup_pid()


def main():
    """CLI entry point."""
    parser = argparse.ArgumentParser(
        prog="auto-retry",
        description="🤖 IDE Auto-Retry — auto-click Retry/Accept/Allow/Run/Yes buttons in your IDE",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  auto-retry                    Run in foreground
  auto-retry --daemon           Run as background daemon
  auto-retry --dry-run          Scan only, don't click
  auto-retry --stop             Stop running instance
  auto-retry --status           Show current status
  auto-retry --install-service  Auto-start on login (Linux)
        """,
    )
    parser.add_argument("--version", action="version", version=f"%(prog)s {__version__}")
    parser.add_argument("--stop", action="store_true", help="Stop running instance")
    parser.add_argument("--status", action="store_true", help="Show current status")
    parser.add_argument("--dry-run", action="store_true", help="Scan only, don't click")
    parser.add_argument("--daemon", "-d", action="store_true", help="Run as background daemon")
    parser.add_argument("--verbose", "-v", action="store_true", help="Verbose output")
    parser.add_argument("--once", action="store_true", help="Run one scan and exit")
    parser.add_argument("--interval", type=float, default=None, help="Poll interval in seconds (default: 1.5)")
    parser.add_argument("--buttons", nargs="+", default=None, help="Button names to auto-click")
    parser.add_argument("--install-service", action="store_true", help="Install systemd user service (Linux)")
    parser.add_argument("--uninstall-service", action="store_true", help="Remove systemd user service (Linux)")

    args = parser.parse_args()

    # Handle service commands
    if args.install_service:
        from .service import install_service
        install_service()
        return

    if args.uninstall_service:
        from .service import uninstall_service
        uninstall_service()
        return

    if args.stop:
        stop_existing()
        return

    if args.status:
        show_status()
        return

    # Load config
    config = load_config()
    save_default_config()

    # Setup accessibility
    ensure_accessibility()
    if SYSTEM == "Linux":
        check_focus_tools()

    # Check for duplicate instances
    check_duplicate()

    # Daemon mode
    if args.daemon:
        daemonize()

    # Write PID
    write_pid()

    # Signal handlers
    def handle_signal(*_):
        log("Stopped")
        cleanup_pid()
        sys.exit(0)

    signal.signal(signal.SIGINT, handle_signal)
    signal.signal(signal.SIGTERM, handle_signal)

    # Banner
    os_icon = {"Linux": "🐧", "Darwin": "🍎", "Windows": "🪟"}.get(SYSTEM, "💻")
    mode = "DRY-RUN" if args.dry_run else "ACTIVE"
    btns = ", ".join(args.buttons or config["buttons"])

    print(f"\n{C.GREEN}🤖 IDE Auto-Retry v{__version__} [{mode}] {os_icon} {SYSTEM} | Poll: {args.interval or config['interval']}s{C.RESET}")
    print(f"{C.GREEN}   Buttons: {btns}{C.RESET}")
    print(f"{C.GREEN}   Stop: Ctrl+C or auto-retry --stop{C.RESET}\n")

    # Run main loop
    run_loop(config, args)


if __name__ == "__main__":
    main()
