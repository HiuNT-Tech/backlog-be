"""
Core scanning and clicking logic for IDE Auto-Retry.
Cross-platform: Linux (AT-SPI2), macOS (AppleScript), Windows (UIAutomation).

Focus-safe: does NOT steal focus from the user's active window.
"""

import os
import platform
import re
import subprocess
import threading
import time

from .config import Colors as C, LOGFILE
from datetime import datetime

SYSTEM = platform.system()


def log(msg, level="info"):
    """Log a message with timestamp and colored icon."""
    ts = datetime.now().strftime("%H:%M:%S")
    icons = {"ok": "✓", "warn": "⚠", "err": "✗", "info": "ℹ", "dbg": "…"}
    cols = {"ok": C.GREEN, "warn": C.YELLOW, "err": C.RED, "info": C.CYAN, "dbg": C.DIM}
    print(f"[{ts}] {cols.get(level, '')}{icons.get(level, ' ')}{C.RESET} {msg}", flush=True)
    try:
        with LOGFILE.open("a", encoding="utf-8") as f:
            f.write(f"[{ts}] {msg}\n")
    except OSError:
        pass


# ==========================================================================
# Accessibility setup
# ==========================================================================

def ensure_accessibility():
    """Auto-patch IDE argv.json to enable force-renderer-accessibility."""
    import json as _json
    from pathlib import Path

    # Try multiple IDE config locations
    ide_dirs = [".antigravity", ".vscode", ".cursor"]
    patched_any = False

    for ide_dir in ide_dirs:
        argv_path = Path.home() / ide_dir / "argv.json"
        if not argv_path.exists():
            continue

        try:
            raw = argv_path.read_text(encoding="utf-8")
            # argv.json may contain // comments — strip them for JSON parsing
            lines = []
            for line in raw.splitlines():
                stripped = line.lstrip()
                if stripped.startswith("//"):
                    lines.append("")  # preserve line count
                else:
                    lines.append(line)
            clean = "\n".join(lines)
            data = _json.loads(clean)

            if data.get("force-renderer-accessibility") is True:
                log(f"{ide_dir}/argv.json: accessibility already enabled ✓", "ok")
                continue

            # Patch the file
            data["force-renderer-accessibility"] = True
            insert_line = '\t// Enable accessibility for auto-retry (AT-SPI2)\n'
            insert_line += '\t"force-renderer-accessibility": true,\n'

            raw_lines = raw.splitlines(True)
            insert_idx = None
            for i in range(len(raw_lines) - 1, -1, -1):
                if raw_lines[i].strip().startswith("}"):
                    insert_idx = i
                    break

            if insert_idx is not None:
                prev_idx = insert_idx - 1
                while prev_idx >= 0 and not raw_lines[prev_idx].strip():
                    prev_idx -= 1
                if prev_idx >= 0:
                    prev = raw_lines[prev_idx].rstrip("\n")
                    if prev.rstrip() and not prev.rstrip().endswith(",") \
                            and not prev.rstrip().startswith("//"):
                        raw_lines[prev_idx] = prev + ",\n"

                raw_lines.insert(insert_idx, "\n" + insert_line)
                argv_path.write_text("".join(raw_lines), encoding="utf-8")

            log(f"{ide_dir}/argv.json: added force-renderer-accessibility=true", "ok")
            patched_any = True

        except Exception as e:
            log(f"Failed to patch {ide_dir}/argv.json: {e}", "warn")

    if patched_any:
        log("⚠ Restart your IDE for accessibility changes to take effect!", "warn")


# ==========================================================================
# Linux Focus Management — save/restore active window (focus-safe)
# ==========================================================================

_HAS_XDOTOOL = None  # cached check


def _check_xdotool():
    """Check if xdotool is available. Cache result."""
    global _HAS_XDOTOOL
    if _HAS_XDOTOOL is None:
        try:
            r = subprocess.run(["xdotool", "--version"],
                               capture_output=True, text=True, timeout=2)
            _HAS_XDOTOOL = r.returncode == 0
        except (FileNotFoundError, subprocess.TimeoutExpired):
            _HAS_XDOTOOL = False
    return _HAS_XDOTOOL


def _get_active_window_id():
    """Get the currently focused window ID. Tries xdotool, then xprop fallback."""
    # Method 1: xdotool
    if _check_xdotool():
        try:
            r = subprocess.run(
                ["xdotool", "getactivewindow"],
                capture_output=True, text=True, timeout=2
            )
            if r.returncode == 0 and r.stdout.strip():
                return r.stdout.strip()
        except (FileNotFoundError, subprocess.TimeoutExpired):
            pass

    # Method 2: xprop fallback
    try:
        r = subprocess.run(
            ["xprop", "-root", "_NET_ACTIVE_WINDOW"],
            capture_output=True, text=True, timeout=2
        )
        if r.returncode == 0:
            match = re.search(r'0x[0-9a-fA-F]+', r.stdout)
            if match:
                return match.group(0)
    except (FileNotFoundError, subprocess.TimeoutExpired):
        pass

    return None


def _restore_focus(window_id):
    """Restore focus to the previously active window."""
    if not window_id:
        return False

    # Method 1: xdotool windowfocus + windowactivate
    if _check_xdotool():
        try:
            subprocess.run(
                ["xdotool", "windowfocus", "--sync", window_id],
                capture_output=True, timeout=2
            )
            subprocess.run(
                ["xdotool", "windowactivate", window_id],
                capture_output=True, timeout=2
            )
            return True
        except (FileNotFoundError, subprocess.TimeoutExpired):
            pass

    # Method 2: wmctrl fallback
    try:
        subprocess.run(
            ["wmctrl", "-i", "-a", window_id],
            capture_output=True, timeout=2
        )
        return True
    except (FileNotFoundError, subprocess.TimeoutExpired):
        pass

    return False


def check_focus_tools():
    """Check and log available focus management tools. Call at startup."""
    has_xdotool = _check_xdotool()

    has_xprop = False
    try:
        subprocess.run(["xprop", "-version"], capture_output=True, timeout=2)
        has_xprop = True
    except (FileNotFoundError, subprocess.TimeoutExpired):
        pass

    has_wmctrl = False
    try:
        subprocess.run(["wmctrl", "--version"], capture_output=True, timeout=2)
        has_wmctrl = True
    except (FileNotFoundError, subprocess.TimeoutExpired):
        pass

    if has_xdotool:
        log("Focus restore: xdotool ✓", "ok")
    elif has_xprop:
        log("Focus restore: xprop (partial) ⚠ — install xdotool for best results", "warn")
    elif has_wmctrl:
        log("Focus restore: wmctrl (fallback) ⚠ — install xdotool for best results", "warn")
    else:
        log("⚠ NO focus-restore tool found! Install xdotool:", "err")
        log("  sudo apt install xdotool", "err")
        log("  Without it, auto-retry WILL steal your focus!", "err")

    return has_xdotool or has_xprop or has_wmctrl


# ==========================================================================
# Linux AT-SPI2 Scanner — focus-safe
# ==========================================================================

def _linux_scan(buttons, ide_names, dry_run=False, verbose=False, max_depth=30):
    """
    Linux scanner using AT-SPI2 accessibility API.
    Returns: 1=clicked, 0=nothing found, -1=no IDE
    """
    import gi
    gi.require_version("Atspi", "2.0")
    from gi.repository import Atspi

    desktop = Atspi.get_desktop(0)
    if not desktop:
        return -1

    target_lower = {b.lower() for b in buttons}
    ide_apps = []

    for i in range(desktop.get_child_count()):
        try:
            ch = desktop.get_child_at_index(i)
            if ch and any(p.lower() in (ch.get_name() or "").lower() for p in ide_names):
                ide_apps.append(ch)
        except Exception:
            pass

    if not ide_apps:
        return -1

    # Save currently focused window BEFORE any click attempt
    saved_focus = _get_active_window_id()

    for app in ide_apps:
        result = _walk_and_click(app, target_lower, dry_run, verbose, Atspi, max_depth=max_depth)
        if result == 1:
            # Restore focus ASYNCHRONOUSLY to minimize keystroke leakage
            def _async_restore(wid):
                time.sleep(0.05)  # Brief wait for click to register
                _restore_focus(wid)
                time.sleep(0.2)   # Second restore in case IDE steals focus late
                _restore_focus(wid)

            if saved_focus:
                t = threading.Thread(target=_async_restore, args=(saved_focus,), daemon=True)
                t.start()
            return result
        if result != 0:
            return result
    return 0


def _walk_and_click(node, targets, dry_run, verbose, Atspi, depth=0, max_depth=30):
    """DFS walk — focus-safe: uses action API, no grab_focus/key simulation."""
    if node is None or depth > max_depth:
        return 0

    try:
        role = node.get_role()
        name = (node.get_name() or "").strip()

        # Check push buttons
        if role == Atspi.Role.PUSH_BUTTON and name and name.lower() in targets:
            if dry_run:
                log(f"[DRY-RUN] Found button [{name}]", "info")
                return 0

            # AT-SPI action API (focus-safe — no grab_focus, no key simulation)
            try:
                action = node.get_action_iface()
                if action and action.get_n_actions() > 0:
                    action.do_action(0)
                    log(f"Clicked [{name}] via action API (focus-safe)", "ok")
                    return 1
            except Exception:
                pass

            log(f"Found [{name}] but failed to click", "warn")
            return 0

        # Check links/labels/toggle buttons
        if name and name.lower() in targets and role in (
            Atspi.Role.LINK, Atspi.Role.LABEL, Atspi.Role.TOGGLE_BUTTON
        ):
            if not dry_run:
                try:
                    action = node.get_action_iface()
                    if action and action.get_n_actions() > 0:
                        action.do_action(0)
                        log(f"Clicked [{name}] ({node.get_role_name()}) via action (focus-safe)", "ok")
                        return 1
                except Exception:
                    pass

        # Recurse into children
        try:
            cc = node.get_child_count()
            for i in range(cc):
                result = _walk_and_click(
                    node.get_child_at_index(i), targets, dry_run, verbose, Atspi,
                    depth + 1, max_depth
                )
                if result != 0:
                    return result
        except Exception:
            pass

    except Exception:
        pass

    return 0


# ==========================================================================
# macOS AppleScript Scanner — with focus restore
# ==========================================================================

def _macos_scan(buttons, ide_names, dry_run=False, verbose=False, **kwargs):
    """macOS scanner using AppleScript + System Events. Focus-safe."""
    btn_list = ", ".join(f'"{b}"' for b in buttons)
    proc_list = ", ".join(f'"{n}"' for n in ide_names if n[0].isupper())
    script = f'''
    set tgt to {{{btn_list}}}
    set procs to {{{proc_list}}}

    -- Save the frontmost application BEFORE clicking
    set frontApp to (path to frontmost application) as text

    tell application "System Events"
        set ap to name of every process whose background only is false
        repeat with p in procs
            if ap contains p then
                tell process p
                    repeat with w in (every window)
                        try
                            repeat with b in (every button of w)
                                set bn to name of b
                                repeat with t in tgt
                                    if bn is equal to t then
                                        if "{dry_run}" is "True" then return "FOUND:" & bn
                                        click b
                                        -- Restore focus to the original application
                                        delay 0.1
                                        tell application frontApp to activate
                                        return "CLICKED:" & bn
                                    end if
                                end repeat
                            end repeat
                        end try
                        try
                            repeat with g in (every group of w)
                                repeat with b in (every button of g)
                                    set bn to name of b
                                    repeat with t in tgt
                                        if bn is equal to t then
                                            if "{dry_run}" is "True" then return "FOUND:" & bn
                                            click b
                                            -- Restore focus to the original application
                                            delay 0.1
                                            tell application frontApp to activate
                                            return "CLICKED:" & bn
                                        end if
                                    end repeat
                                end repeat
                            end repeat
                        end try
                    end repeat
                end tell
            end if
        end repeat
    end tell
    return "NONE"
    '''
    try:
        r = subprocess.run(["osascript", "-e", script],
                           capture_output=True, text=True, timeout=10)
        out = r.stdout.strip()
        if out.startswith("CLICKED:"):
            log(f"Clicked [{out.split(':')[1]}] (macOS, focus restored)", "ok")
            return 1
        if out.startswith("FOUND:"):
            log(f"[DRY-RUN] Found [{out.split(':')[1]}]", "info")
            return 0
        return 0
    except Exception:
        return -1


# ==========================================================================
# Windows UIAutomation Scanner — with focus restore
# ==========================================================================

def _windows_scan(buttons, ide_names, dry_run=False, verbose=False, **kwargs):
    """Windows scanner using PowerShell UIAutomation. Focus-safe."""
    btn_names = ",".join(f"'{b}'" for b in buttons)
    ide_pattern = "|".join(ide_names)
    ps = f'''
$ErrorActionPreference="SilentlyContinue"

# Load UI Automation
Add-Type -AssemblyName UIAutomationClient,UIAutomationTypes

# Load Win32 API for focus save/restore
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class FocusHelper {{
    [DllImport("user32.dll")]
    public static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")]
    [return: MarshalAs(UnmanagedType.Bool)]
    public static extern bool SetForegroundWindow(IntPtr hWnd);
}}
"@

# Save current focused window
$savedWindow = [FocusHelper]::GetForegroundWindow()

$root=[System.Windows.Automation.AutomationElement]::RootElement
$tgt=@({btn_names})
$bc=New-Object System.Windows.Automation.PropertyCondition(
    [System.Windows.Automation.AutomationElement]::ControlTypeProperty,
    [System.Windows.Automation.ControlType]::Button)
$wins=$root.FindAll([System.Windows.Automation.TreeScope]::Children,
    [System.Windows.Automation.Condition]::TrueCondition)
foreach($w in $wins){{
    $wn=$w.Current.Name
    if($wn -notmatch "{ide_pattern}"){{continue}}
    $btns=$w.FindAll([System.Windows.Automation.TreeScope]::Descendants,$bc)
    foreach($b in $btns){{
        $bn=$b.Current.Name
        foreach($t in $tgt){{
            if($bn -eq $t){{
                if("{dry_run}" -eq "True"){{Write-Output "FOUND:$bn";exit 0}}
                try {{
                    $ip=$b.GetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern)
                    if($ip){{
                        $ip.Invoke()
                        # Restore focus after click
                        Start-Sleep -Milliseconds 100
                        [FocusHelper]::SetForegroundWindow($savedWindow) | Out-Null
                        Write-Output "CLICKED:$bn"
                        exit 0
                    }}
                }} catch {{
                    # Fallback: try SetFocus + SendKeys
                    try {{
                        $b.SetFocus()
                        [System.Windows.Forms.SendKeys]::SendWait("{{ENTER}}")
                        Start-Sleep -Milliseconds 100
                        [FocusHelper]::SetForegroundWindow($savedWindow) | Out-Null
                        Write-Output "CLICKED:$bn"
                        exit 0
                    }} catch {{}}
                }}
            }}
        }}
    }}
}}
Write-Output "NONE"
'''
    try:
        r = subprocess.run(["powershell", "-NoProfile", "-NonInteractive",
                            "-ExecutionPolicy", "Bypass", "-Command", ps],
                           capture_output=True, text=True, timeout=15)
        out = r.stdout.strip()
        if out.startswith("CLICKED:"):
            log(f"Clicked [{out.split(':')[1]}] (Windows, focus restored)", "ok")
            return 1
        if out.startswith("FOUND:"):
            log(f"[DRY-RUN] Found [{out.split(':')[1]}]", "info")
            return 0
        return 0
    except Exception:
        return -1


# ==========================================================================
# Unified scan dispatcher
# ==========================================================================

def scan(buttons, ide_names, dry_run=False, verbose=False, max_depth=30):
    """
    Scan for target buttons in IDE windows and click them.
    Returns: 1=clicked, 0=nothing found, -1=no IDE detected
    """
    if SYSTEM == "Linux":
        try:
            return _linux_scan(buttons, ide_names, dry_run, verbose, max_depth)
        except ImportError:
            log("AT-SPI2 unavailable. Install: sudo apt install python3-gi gir1.2-atspi-2.0", "err")
            return -1
    elif SYSTEM == "Darwin":
        return _macos_scan(buttons, ide_names, dry_run, verbose)
    elif SYSTEM == "Windows":
        return _windows_scan(buttons, ide_names, dry_run, verbose)
    else:
        log(f"Unsupported OS: {SYSTEM}", "err")
        return -1
