import type { PlasmoCSConfig } from "plasmo"
import type { CopyDetectedMessage } from "../lib/messages"

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"],
  run_at: "document_idle",
}

let lastCopiedText = ""
let pendingKeyboardCopy = false

const WIDGET_W = 376  // widget width + small margin
const WIDGET_H = 320  // conservative widget height

function getSelectionPosition(): { x: number; y: number } {
  const selection = window.getSelection()
  let x = window.innerWidth / 2 - WIDGET_W / 2
  let y = window.innerHeight / 2 - WIDGET_H / 2
  if (selection && selection.rangeCount > 0) {
    const range = selection.getRangeAt(0)
    const rect = range.getBoundingClientRect()
    if (rect.width > 0 || rect.height > 0) {
      // Prefer below-right of selection; flip above if not enough room below
      const spaceBelow = window.innerHeight - rect.bottom
      const preferAbove = spaceBelow < WIDGET_H + 16
      x = rect.right + 16
      y = preferAbove ? rect.top - WIDGET_H - 8 : rect.bottom + 8
    }
  }
  // Clamp so widget is always fully visible
  x = Math.max(8, Math.min(x, window.innerWidth - WIDGET_W))
  y = Math.max(8, Math.min(y, window.innerHeight - WIDGET_H))
  return { x, y }
}

function isContextInvalidated(): boolean {
  try {
    // Accessing chrome.runtime.id throws if context is invalidated
    return !chrome.runtime?.id
  } catch {
    return true
  }
}

function showReloadBanner() {
  if (document.getElementById('clipflow-reload-banner')) return
  const banner = document.createElement('div')
  banner.id = 'clipflow-reload-banner'
  banner.style.cssText = [
    'position:fixed', 'bottom:20px', 'right:20px', 'z-index:2147483647',
    'background:#1A1A1A', 'color:#fff', 'border:1px solid rgba(255,255,255,0.1)',
    'border-radius:12px', 'padding:12px 16px', 'font-family:system-ui,sans-serif',
    'font-size:13px', 'display:flex', 'align-items:center', 'gap:10px',
    'box-shadow:0 8px 32px rgba(0,0,0,0.4)', 'max-width:320px',
  ].join(';')
  banner.innerHTML = `
    <span>🔄</span>
    <span style="flex:1">ClipFlow was updated. <strong>Reload this tab</strong> to enable copy detection.</span>
    <button onclick="location.reload()" style="background:#6366F1;color:#fff;border:none;border-radius:6px;padding:4px 10px;cursor:pointer;font-size:12px;white-space:nowrap">Reload</button>
    <button onclick="this.parentElement.remove()" style="background:none;border:none;color:#666;cursor:pointer;font-size:16px;line-height:1">×</button>
  `
  document.body?.appendChild(banner)
}

function sendCopyMessage(text: string) {
  if (!text || !text.trim()) return
  if (text.trim() === lastCopiedText) return
  if (isContextInvalidated()) { showReloadBanner(); return }
  lastCopiedText = text.trim()
  const message: CopyDetectedMessage = {
    type: "COPY_DETECTED",
    text: text.trim(),
    position: getSelectionPosition(),
    sourceUrl: window.location.href,
  }
  chrome.runtime.sendMessage(message).catch((err: Error) => {
    if (err?.message?.includes('Extension context invalidated')) {
      showReloadBanner()
    }
  })
}

// Primary: listen to the copy DOM event
document.addEventListener("copy", async (event: ClipboardEvent) => {
  pendingKeyboardCopy = false
  let text = ""
  if (event.clipboardData) {
    text = event.clipboardData.getData("text/plain")
  }
  if (!text) {
    try { text = await navigator.clipboard.readText() } catch { /* ignore */ }
  }
  sendCopyMessage(text)
})

// Backup: Ctrl+C / Cmd+C keydown — read clipboard after a short delay
// (clipboard isn't updated until after the copy event fires)
document.addEventListener("keydown", (event: KeyboardEvent) => {
  const isCopy = (event.ctrlKey || event.metaKey) && event.key === "c"
  if (!isCopy) return
  const selection = window.getSelection()
  const selectedText = selection?.toString() ?? ""
  if (!selectedText.trim()) return
  pendingKeyboardCopy = true
  // Use the selected text directly — it's what will be copied
  setTimeout(() => {
    if (pendingKeyboardCopy) {
      pendingKeyboardCopy = false
      sendCopyMessage(selectedText)
    }
  }, 100)
})
