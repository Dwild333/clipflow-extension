import { useState, useEffect } from "react"
import "./popup.css"
import { ExtensionPopup } from "./components/ExtensionPopup"
import { OnboardingFlow } from "./components/OnboardingFlow"
import { getSettings, getStorage, setStorage } from "./lib/storage"

function IndexPopup() {
  const [isConnected, setIsConnected] = useState(false)
  const [isPro, setIsPro] = useState(false)
  const [savesThisMonth, setSavesThisMonth] = useState(0)
  const [theme, setTheme] = useState<"dark" | "light">("dark")
  const [widgetEnabled, setWidgetEnabled] = useState(true)
  const [autoDismiss, setAutoDismiss] = useState(false)
  const [dismissTimer, setDismissTimer] = useState(5)
  const [includeSourceUrl, setIncludeSourceUrl] = useState(false)
  const [includeDateTime, setIncludeDateTime] = useState(false)
  const [includeStamp, setIncludeStamp] = useState(false)
  const [defaultDestinationMode, setDefaultDestinationMode] = useState<'fixed' | 'last-saved'>('fixed')
  const [defaultDestinationId, setDefaultDestinationId] = useState<string | null>(null)
  const [defaultDestinationName, setDefaultDestinationName] = useState('Choose a page')
  const [defaultDestinationEmoji, setDefaultDestinationEmoji] = useState('📝')
  const [defaultDestinationIconUrl, setDefaultDestinationIconUrl] = useState<string | null>(null)
  const [newPageParentId, setNewPageParentId] = useState<string | null>(null)
  const [newPageParentName, setNewPageParentName] = useState('Choose a parent page')
  const [newPageParentEmoji, setNewPageParentEmoji] = useState('📄')
  const [newPageParentIconUrl, setNewPageParentIconUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [workspaceName, setWorkspaceName] = useState<string | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)

  async function loadState() {
    const [auth, settings, license, usage] = await Promise.all([
      getStorage("auth"),
      getSettings(),
      getStorage("license"),
      getStorage("usage"),
    ])

    const connected = !!auth?.accessToken
    setIsConnected(connected)
    setWorkspaceName(auth?.workspaceName ?? null)
    setIsPro(!!(license?.is_pro && (license.expires_at === 0 || license.expires_at > Date.now())))
    setTheme(settings.theme)
    setWidgetEnabled(settings.widgetEnabled)
    setAutoDismiss(settings.autoDismiss ?? false)
    setDismissTimer(settings.dismissTimer ?? 5)
    setIncludeSourceUrl(settings.includeSourceUrl ?? false)
    setIncludeDateTime(settings.includeDateTime ?? false)
    setIncludeStamp(settings.includeStamp ?? false)
    setDefaultDestinationMode(settings.defaultDestinationMode ?? 'fixed')
    setDefaultDestinationId(settings.defaultDestinationId ?? null)
    setDefaultDestinationName(settings.defaultDestinationName ?? 'Choose a page')
    setDefaultDestinationEmoji(settings.defaultDestinationEmoji ?? '📝')
    setDefaultDestinationIconUrl(settings.defaultDestinationIconUrl ?? null)
    setNewPageParentId(settings.newPageParentId ?? null)
    setNewPageParentName(settings.newPageParentName ?? 'Choose a parent page')
    setNewPageParentEmoji(settings.newPageParentEmoji ?? '📄')
    setNewPageParentIconUrl(settings.newPageParentIconUrl ?? null)

    const currentMonth = new Date().toISOString().slice(0, 7)
    setSavesThisMonth(usage?.month === currentMonth ? usage.saves_this_month : 0)

    const onboardingComplete = await getStorage("onboardingComplete")
    if (connected && !onboardingComplete) {
      setShowOnboarding(true)
    }

    setLoading(false)
  }

  useEffect(() => {
    loadState()
  }, [])

  const handleToggleWidget = async (enabled: boolean) => {
    setWidgetEnabled(enabled)
    const settings = await getSettings()
    await chrome.storage.local.set({ settings: { ...settings, widgetEnabled: enabled } })
  }

  const handleReconnect = async () => {
    const result = await chrome.runtime.sendMessage({ type: "NOTION_CONNECT" }) as { success: boolean; error?: string }
    if (result?.success) {
      await loadState()
    }
  }

  const handleDisconnect = async () => {
    await chrome.runtime.sendMessage({ type: "NOTION_DISCONNECT" })
    setIsConnected(false)
    setWorkspaceName(null)
    setIsPro(false)
    setShowSettings(false)
  }


  const handleThemeChange = async (newTheme: "dark" | "light") => {
    setTheme(newTheme)
    const settings = await getSettings()
    await setStorage("settings", { ...settings, theme: newTheme })
  }

  const handleDefaultDestinationModeChange = async (mode: 'fixed' | 'last-saved') => {
    setDefaultDestinationMode(mode)
    const settings = await getSettings()
    await setStorage('settings', { ...settings, defaultDestinationMode: mode })
  }

  const handleDefaultDestinationChange = async (page: { id: string; emoji: string; iconUrl?: string; name: string }) => {
    setDefaultDestinationId(page.id)
    setDefaultDestinationName(page.name)
    setDefaultDestinationEmoji(page.emoji)
    setDefaultDestinationIconUrl(page.iconUrl ?? null)
    const settings = await getSettings()
    await setStorage('settings', {
      ...settings,
      defaultDestinationId: page.id,
      defaultDestinationName: page.name,
      defaultDestinationEmoji: page.emoji,
      defaultDestinationIconUrl: page.iconUrl ?? null,
    })
  }

  const handleNewPageParentChange = async (page: { id: string; emoji: string; iconUrl?: string; name: string }) => {
    setNewPageParentId(page.id)
    setNewPageParentName(page.name)
    setNewPageParentEmoji(page.emoji)
    setNewPageParentIconUrl(page.iconUrl ?? null)
    const settings = await getSettings()
    await setStorage('settings', {
      ...settings,
      newPageParentId: page.id,
      newPageParentName: page.name,
      newPageParentEmoji: page.emoji,
      newPageParentIconUrl: page.iconUrl ?? null,
    })
  }

  const handleSettingToggle = async (key: "autoDismiss" | "includeSourceUrl" | "includeDateTime" | "includeStamp", value: boolean) => {
    if (key === "autoDismiss") setAutoDismiss(value)
    if (key === "includeSourceUrl") setIncludeSourceUrl(value)
    if (key === "includeDateTime") setIncludeDateTime(value)
    if (key === "includeStamp") setIncludeStamp(value)
    const settings = await getSettings()
    await setStorage("settings", { ...settings, [key]: value })
  }

  const handleDismissTimerChange = async (value: number) => {
    setDismissTimer(value)
    const settings = await getSettings()
    await setStorage("settings", { ...settings, dismissTimer: value })
  }

  const handleOpenSettings = () => {
    setShowSettings(true)
  }

  if (showOnboarding) {
    return (
      <OnboardingFlow
        theme={theme}
        workspaceName={workspaceName}
        onComplete={() => {
          setShowOnboarding(false)
        }}
      />
    )
  }

  if (loading) {
    return (
      <div className="w-[320px] h-[200px] flex items-center justify-center" style={{ background: 'linear-gradient(180deg, rgba(28,28,32,1) 0%, rgba(14,14,18,1) 100%)' }}>
        <div className="w-6 h-6 border-2 border-[#333] border-t-indigo-500 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <ExtensionPopup
      theme={theme}
      isConnected={isConnected}
      isPro={isPro}
      savesToday={savesThisMonth}
      dailyLimit={75}
      widgetEnabled={widgetEnabled}
      workspaceName={workspaceName}
      showSettings={showSettings}
      autoDismiss={autoDismiss}
      dismissTimer={dismissTimer}
      includeSourceUrl={includeSourceUrl}
      includeDateTime={includeDateTime}
      includeStamp={includeStamp}
      defaultDestinationMode={defaultDestinationMode}
      defaultDestinationId={defaultDestinationId}
      defaultDestinationName={defaultDestinationName}
      defaultDestinationEmoji={defaultDestinationEmoji}
      defaultDestinationIconUrl={defaultDestinationIconUrl}
      newPageParentId={newPageParentId}
      newPageParentName={newPageParentName}
      newPageParentEmoji={newPageParentEmoji}
      newPageParentIconUrl={newPageParentIconUrl}
      onToggleWidget={handleToggleWidget}
      onReconnect={handleReconnect}
      onDisconnect={handleDisconnect}
      onThemeChange={handleThemeChange}
      onSettingToggle={handleSettingToggle}
      onDismissTimerChange={handleDismissTimerChange}
      onDefaultDestinationModeChange={handleDefaultDestinationModeChange}
      onDefaultDestinationChange={handleDefaultDestinationChange}
      onNewPageParentChange={handleNewPageParentChange}
      onActivateLicense={loadState}
      onOpenSettings={handleOpenSettings}
      onCloseSettings={() => setShowSettings(false)}
    />
  )
}

export default IndexPopup
