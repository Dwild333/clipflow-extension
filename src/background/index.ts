import { getSettings, getStorage, setStorage } from "../lib/storage"
import { launchNotionOAuth, disconnectNotion } from "../lib/oauth"
import { appendTextToPage, recordRecentSave, searchNotionPages, createNotionPage, createPageInDatabase } from "../lib/notion"
import { canSave, incrementSaveCount } from "../lib/limits"
import type { ExtensionMessage, ShowWidgetMessage, SaveResultMessage } from "../lib/messages"

// Open uninstall feedback survey when the extension is removed
chrome.runtime.setUninstallURL("https://notionflow.io/clipper/uninstall")

// ─── Background License Verification ────────────────────────────────────────

const CLIPPER_API_URL = process.env.PLASMO_PUBLIC_CLIPPER_API_URL!
const CLIPPER_API_KEY = process.env.PLASMO_PUBLIC_CLIPPER_API_KEY!

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create('verify-license', { periodInMinutes: 1440 })
  verifyLicenseInBackground()
})

chrome.runtime.onStartup.addListener(() => {
  verifyLicenseInBackground()
})

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'verify-license') {
    await verifyLicenseInBackground()
  }
})

async function verifyLicenseInBackground() {
  try {
    const license = await getStorage("license")
    const email = license?.email
    if (!email) return // Free tier user, no email stored — nothing to verify

    const res = await fetch(`${CLIPPER_API_URL}/api/verify-pro`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": CLIPPER_API_KEY },
      body: JSON.stringify({ email }),
    })
    if (!res.ok) return
    const data = await res.json() as { is_pro: boolean }

    await setStorage("license", {
      email,
      is_pro: data.is_pro,
      plan: null,
      verified_at: Date.now(),
      expires_at: 0,
    })
  } catch {
    // Network failure — keep cached status
  }
}

// ─── Message Router ──────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener(
  (message: ExtensionMessage, sender, sendResponse) => {
    switch (message.type) {
      case "COPY_DETECTED":
        handleCopyDetected(message, sender.tab?.id).then(() => sendResponse({ ok: true }))
        return true

      case "SAVE_TO_NOTION":
        handleSaveToNotion(message, sender.tab?.id).then(sendResponse)
        return true

      case "NOTION_CONNECT":
        handleConnect().then(sendResponse)
        return true

      case "NOTION_DISCONNECT":
        handleDisconnect().then(sendResponse)
        return true

      case "SEARCH_PAGES":
        handleSearchPages(message.query, message.pagesOnly).then(sendResponse)
        return true

      case "CREATE_PAGE":
        handleCreatePage(message.parentPageId, message.title).then(sendResponse)
        return true

      case "GET_AUTH_STATE":
        handleGetAuthState().then(sendResponse)
        return true

      case "REFRESH_LICENSE":
        verifyLicenseInBackground().then(() =>
          getStorage("license").then(license =>
            sendResponse({ is_pro: !!(license?.is_pro) })
          )
        )
        return true

      default:
        return false
    }
  }
)

// ─── Handlers ────────────────────────────────────────────────────────────────

async function handleCopyDetected(
  message: { type: "COPY_DETECTED"; text: string; position: { x: number; y: number }; sourceUrl: string },
  tabId: number | undefined
) {
  if (!tabId) return

  const settings = await getSettings()
  if (!settings.widgetEnabled) return

  const auth = await getStorage("auth")
  if (!auth?.accessToken) return

  // Pick default destination based on mode
  const mode = settings.defaultDestinationMode ?? 'fixed'
  let defaultDestination: ShowWidgetMessage['defaultDestination'] = null
  if (mode === 'last-saved' && settings.lastSavedDestinationId) {
    defaultDestination = {
      id: settings.lastSavedDestinationId,
      emoji: settings.lastSavedDestinationEmoji,
      iconUrl: settings.lastSavedDestinationIconUrl ?? undefined,
      name: settings.lastSavedDestinationName,
      type: settings.lastSavedDestinationType ?? 'page',
    }
  } else if (mode === 'fixed' && settings.defaultDestinationId) {
    defaultDestination = {
      id: settings.defaultDestinationId,
      emoji: settings.defaultDestinationEmoji,
      iconUrl: settings.defaultDestinationIconUrl ?? undefined,
      name: settings.defaultDestinationName,
      type: settings.defaultDestinationType ?? 'page',
    }
  }

  // Convert default destination icon to data URL so content script CSP doesn't block it
  if (defaultDestination?.iconUrl) {
    const dataUrl = await fetchIconAsDataUrl(defaultDestination.iconUrl)
    defaultDestination = { ...defaultDestination, iconUrl: dataUrl }
  }

  const license = await getStorage("license")
  const isPro = !!(license?.is_pro && (license.expires_at === 0 || license.expires_at > Date.now()))

  const showMessage: ShowWidgetMessage = {
    type: "SHOW_WIDGET",
    text: message.text,
    position: message.position,
    defaultDestination,
    settings: {
      theme: settings.theme,
      autoDismiss: settings.autoDismiss,
      dismissTimer: settings.dismissTimer,
      isPro,
    },
  }

  chrome.tabs.sendMessage(tabId, showMessage).catch(() => {
    // Content script not ready on this tab — user needs to reload the tab
  })
}

async function handleSaveToNotion(
  message: { type: "SAVE_TO_NOTION"; text: string; destinationId: string; destinationName: string; destinationEmoji: string; destinationIconUrl?: string; destinationType?: 'page' | 'database'; sourceUrl: string },
  _tabId: number | undefined
): Promise<SaveResultMessage> {
  try {
    const check = await canSave()
    if (!check.allowed) {
      return { type: "SAVE_RESULT", success: false, error: check.reason ?? "Monthly limit reached. Upgrade to Pro for unlimited saves." }
    }

    const settings = await getSettings()

    const isDatabase = message.destinationType === 'database'

    if (isDatabase) {
      // Create new page in database
      await createPageInDatabase(message.destinationId, message.text, {
        sourceUrl: settings.includeSourceUrl ? message.sourceUrl : undefined,
        includeDateTime: settings.includeDateTime,
        includeStamp: settings.includeStamp,
      })
    } else {
      // Append to existing page
      await appendTextToPage(message.destinationId, message.text, {
        sourceUrl: settings.includeSourceUrl ? message.sourceUrl : undefined,
        includeDateTime: settings.includeDateTime,
        includeStamp: settings.includeStamp,
      })
    }

    await incrementSaveCount()

    // Report clip event to server (fire-and-forget, don't block the save flow)
    const storage = await chrome.storage.local.get(['license'])
    const licenseEmail = (storage.license as { email?: string } | undefined)?.email
    if (licenseEmail) {
      fetch(`${CLIPPER_API_URL}/api/report-clip`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": CLIPPER_API_KEY },
        body: JSON.stringify({
          email: licenseEmail,
          source_url: message.sourceUrl,
          destination_name: message.destinationName,
          destination_type: message.destinationType ?? 'page',
          content_length: message.text?.length ?? 0,
        }),
      }).catch(() => {}) // silently ignore reporting failures
    }

    // Update last-saved destination
    const currentSettings = await getSettings()
    await setStorage('settings', {
      ...currentSettings,
      lastSavedDestinationId: message.destinationId,
      lastSavedDestinationEmoji: message.destinationEmoji,
      lastSavedDestinationName: message.destinationName,
      lastSavedDestinationIconUrl: message.destinationIconUrl ?? null,
      lastSavedDestinationType: message.destinationType ?? 'page',
    })
    await recordRecentSave({
      text: message.text,
      destinationId: message.destinationId,
      destinationName: message.destinationName,
      destinationEmoji: message.destinationEmoji,
      destinationIconUrl: message.destinationIconUrl,
      destinationType: message.destinationType,
      sourceUrl: message.sourceUrl,
    })

    return { type: "SAVE_RESULT", success: true }
  } catch (err) {
    const error = err instanceof Error ? err.message : "Save failed"
    return { type: "SAVE_RESULT", success: false, error }
  }
}

async function handleConnect(): Promise<{ success: boolean; connection?: import("../lib/oauth").NotionOAuthResult; error?: string }> {
  try {
    console.log('[NotionConnect] Starting OAuth flow...')
    const connection = await launchNotionOAuth()
    console.log('[NotionConnect] OAuth success, saving state...', connection)
    await setStorage("onboardingComplete", false)
    console.log('[NotionConnect] State saved, returning success')
    return { success: true, connection }
  } catch (err) {
    console.error('[NotionConnect] OAuth failed:', err)
    return { success: false, error: err instanceof Error ? err.message : "OAuth failed" }
  }
}

async function handleCreatePage(
  parentPageId: string,
  title: string
): Promise<{ success: boolean; page?: import("../lib/notion").NotionPage; error?: string }> {
  try {
    const page = await createNotionPage(parentPageId, title)
    return { success: true, page }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Create page failed" }
  }
}

/** Fetch a remote icon URL and return it as a base64 data URL.
 *  Runs in the service worker so it bypasses page-level CSP in content scripts. */
async function fetchIconAsDataUrl(url: string): Promise<string | undefined> {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 4000)
    const res = await fetch(url, { signal: controller.signal })
    clearTimeout(timer)
    if (!res.ok) return undefined
    const mime = (res.headers.get('content-type') || 'image/png').split(';')[0]
    const buf = await res.arrayBuffer()
    const bytes = new Uint8Array(buf)
    let binary = ''
    const CHUNK = 8192
    for (let i = 0; i < bytes.length; i += CHUNK) {
      binary += String.fromCharCode(...Array.from(bytes.subarray(i, i + CHUNK)))
    }
    return `data:${mime};base64,${btoa(binary)}`
  } catch {
    return undefined
  }
}

async function handleSearchPages(query: string, pagesOnly?: boolean): Promise<{ success: boolean; pages?: import("../lib/notion").NotionPage[]; error?: string }> {
  try {
    const settings = await getSettings()
    const includeDatabases = pagesOnly ? false : (settings.includeDatabases ?? false)
    const pages = await searchNotionPages(query, includeDatabases)
    // Convert remote icon URLs → data URLs so they render in content scripts
    // (subject to the host page's CSP) and in the popup (presigned URLs expire).
    const pagesWithIcons = await Promise.all(
      pages.map(async (page) => {
        if (!page.iconUrl) return page
        const dataUrl = await fetchIconAsDataUrl(page.iconUrl)
        return { ...page, iconUrl: dataUrl }
      })
    )
    return { success: true, pages: pagesWithIcons }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Search failed" }
  }
}

async function handleGetAuthState(): Promise<{ isConnected: boolean; workspaceName?: string | null }> {
  const auth = await getStorage("auth")
  return { isConnected: !!auth?.accessToken, workspaceName: auth?.workspaceName }
}

async function handleDisconnect(): Promise<{ success: boolean }> {
  await disconnectNotion()
  return { success: true }
}
