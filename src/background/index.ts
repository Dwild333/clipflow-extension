import { getSettings, getStorage, setStorage } from "../lib/storage"
import { launchNotionOAuth, disconnectNotion } from "../lib/oauth"
import { appendTextToPage, recordRecentSave, searchNotionPages, createNotionPage } from "../lib/notion"
import { canSave, incrementSaveCount } from "../lib/limits"
import { verifyLicense, saveLicenseToStorage, getLicenseFromStorage } from "../lib/license"
import type { ExtensionMessage, ShowWidgetMessage, SaveResultMessage } from "../lib/messages"

// Open uninstall feedback survey when the extension is removed
chrome.runtime.setUninstallURL("https://notionflow.io/clipper/uninstall")

// ─── Background License Verification ────────────────────────────────────────

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
  const license = await getLicenseFromStorage()
  if (!license?.email) return
  try {
    const status = await verifyLicense(license.email)
    await saveLicenseToStorage(license.email, status)
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
        handleSearchPages(message.query).then(sendResponse)
        return true

      case "CREATE_PAGE":
        handleCreatePage(message.parentPageId, message.title).then(sendResponse)
        return true

      case "GET_AUTH_STATE":
        handleGetAuthState().then(sendResponse)
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
    }
  } else if (mode === 'fixed' && settings.defaultDestinationId) {
    defaultDestination = {
      id: settings.defaultDestinationId,
      emoji: settings.defaultDestinationEmoji,
      iconUrl: settings.defaultDestinationIconUrl ?? undefined,
      name: settings.defaultDestinationName,
    }
  }

  const showMessage: ShowWidgetMessage = {
    type: "SHOW_WIDGET",
    text: message.text,
    position: message.position,
    defaultDestination,
    settings: {
      theme: settings.theme,
      autoDismiss: settings.autoDismiss,
      dismissTimer: settings.dismissTimer,
    },
  }

  chrome.tabs.sendMessage(tabId, showMessage).catch(() => {
    // Content script not ready on this tab — user needs to reload the tab
  })
}

async function handleSaveToNotion(
  message: { type: "SAVE_TO_NOTION"; text: string; destinationId: string; destinationName: string; destinationEmoji: string; destinationIconUrl?: string; sourceUrl: string },
  _tabId: number | undefined
): Promise<SaveResultMessage> {
  try {
    const check = await canSave()
    if (!check.allowed) {
      return { type: "SAVE_RESULT", success: false, error: check.reason ?? "Monthly limit reached. Upgrade to Pro for unlimited saves." }
    }

    const settings = await getSettings()
    await appendTextToPage(message.destinationId, message.text, {
      sourceUrl: settings.includeSourceUrl ? message.sourceUrl : undefined,
      includeDateTime: settings.includeDateTime,
      includeStamp: settings.includeStamp,
    })
    await incrementSaveCount()
    // Update last-saved destination
    const currentSettings = await getSettings()
    await setStorage('settings', {
      ...currentSettings,
      lastSavedDestinationId: message.destinationId,
      lastSavedDestinationEmoji: message.destinationEmoji,
      lastSavedDestinationName: message.destinationName,
      lastSavedDestinationIconUrl: message.destinationIconUrl ?? null,
    })
    await recordRecentSave({
      text: message.text,
      destinationId: message.destinationId,
      destinationName: message.destinationName,
      destinationEmoji: message.destinationEmoji,
      destinationIconUrl: message.destinationIconUrl,
      sourceUrl: message.sourceUrl,
    })

    return { type: "SAVE_RESULT", success: true }
  } catch (err) {
    const error = err instanceof Error ? err.message : "Save failed"
    return { type: "SAVE_RESULT", success: false, error }
  }
}

async function handleConnect(): Promise<{ success: boolean; error?: string }> {
  try {
    await launchNotionOAuth()
    await setStorage("onboardingComplete", false)
    return { success: true }
  } catch (err) {
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

async function handleSearchPages(query: string): Promise<{ success: boolean; pages?: import("../lib/notion").NotionPage[]; error?: string }> {
  try {
    const pages = await searchNotionPages(query)
    return { success: true, pages }
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
