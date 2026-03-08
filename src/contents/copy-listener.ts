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

  const icon = document.createElement('span')
  icon.textContent = '🔄'

  const msg = document.createElement('span')
  msg.style.flex = '1'
  const strong = document.createElement('strong')
  strong.textContent = 'Reload this tab'
  msg.append('Clipper was updated. ', strong, ' to enable copy detection.')

  const reloadBtn = document.createElement('button')
  reloadBtn.textContent = 'Reload'
  reloadBtn.style.cssText = 'background:#6366F1;color:#fff;border:none;border-radius:6px;padding:4px 10px;cursor:pointer;font-size:12px;white-space:nowrap'
  reloadBtn.addEventListener('click', () => location.reload())

  const closeBtn = document.createElement('button')
  closeBtn.textContent = '×'
  closeBtn.style.cssText = 'background:none;border:none;color:#666;cursor:pointer;font-size:16px;line-height:1'
  closeBtn.addEventListener('click', () => banner.remove())

  banner.append(icon, msg, reloadBtn, closeBtn)
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
  // Try clipboardData first (standard)
  if (event.clipboardData) {
    text = event.clipboardData.getData("text/plain")
  }
  // Many sites (e.g. news sites) intercept copy and replace/clear clipboardData.
  // Fall back to the current selection text, which is always what the user highlighted.
  if (!text) {
    text = window.getSelection()?.toString() ?? ""
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

// Intercept programmatic clipboard writes (e.g. ChatGPT/Claude/Grok "Copy" buttons
// that call navigator.clipboard.writeText directly without firing a copy DOM event).
// The main-world script (clipboard-interceptor.ts) patches writeText and posts a message.
window.addEventListener("message", (event: MessageEvent) => {
  if (event.source !== window) return
  if (event.data?.type !== "__CLIPFLOW_CLIPBOARD_WRITE__") return
  const text = event.data.text
  if (typeof text === "string") {
    sendCopyMessage(text)
  }
})
