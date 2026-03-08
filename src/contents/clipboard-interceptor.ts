import type { PlasmoCSConfig } from "plasmo"

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"],
  world: "MAIN",
  run_at: "document_start",
}

// This script runs in the MAIN world (not isolated) to intercept
// navigator.clipboard.writeText() and write() calls that sites like Claude,
// Perplexity, ChatGPT use for their "Copy" buttons. These don't trigger copy events.

type PatchedWindow = Window & { __clipflowPatched?: boolean }

// Prevent double-patching if script runs multiple times
if (!(window as PatchedWindow).__clipflowPatched) {
  ;(window as PatchedWindow).__clipflowPatched = true

  // Patch writeText (used by many sites including Claude, Perplexity)
  const originalWriteText = navigator.clipboard.writeText.bind(navigator.clipboard)
  navigator.clipboard.writeText = async function (text: string): Promise<void> {
    window.postMessage({ type: "__CLIPFLOW_CLIPBOARD_WRITE__", text }, "*")
    return originalWriteText(text)
  }

  // Patch write (used by ChatGPT and other sites that copy HTML + plain text)
  const originalWrite = navigator.clipboard.write.bind(navigator.clipboard)
  navigator.clipboard.write = async function (data: ClipboardItem[]): Promise<void> {
    try {
      for (const item of data) {
        if (item.types.includes("text/plain")) {
          const blob = await item.getType("text/plain")
          const text = await blob.text()
          if (text) window.postMessage({ type: "__CLIPFLOW_CLIPBOARD_WRITE__", text }, "*")
          break
        }
      }
    } catch {
      // Ignore errors reading clipboard items
    }
    return originalWrite(data)
  }
}
