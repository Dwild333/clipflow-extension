import { useState, useEffect } from "react"
import "./popup.css"
import { ExtensionPopup } from "./components/ExtensionPopup"
import { OnboardingFlow } from "./components/OnboardingFlow"
import { getSettings, getStorage, setStorage } from "./lib/storage"

function IndexPopup() {
  const [isConnected, setIsConnected] = useState(false)
  const [isPro, setIsPro] = useState(false)
  const [savesToday, setSavesToday] = useState(0)
  const [theme, setTheme] = useState<"dark" | "light">("dark")
  const [widgetEnabled, setWidgetEnabled] = useState(true)
  const [loading, setLoading] = useState(true)
  const [workspaceName, setWorkspaceName] = useState<string | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)

  async function loadState() {
    const [auth, settings, subscription, dailySaves] = await Promise.all([
      getStorage("auth"),
      getSettings(),
      getStorage("subscription"),
      getStorage("dailySaves"),
    ])

    const connected = !!auth?.accessToken
    setIsConnected(connected)
    setWorkspaceName(auth?.workspaceName ?? null)
    setIsPro(subscription?.isPro ?? false)
    setTheme(settings.theme)
    setWidgetEnabled(settings.widgetEnabled)

    const today = new Date().toISOString().split("T")[0]
    setSavesToday(dailySaves?.date === today ? dailySaves.count : 0)

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
    setShowSettings(false)
  }

  const handleThemeChange = async (newTheme: "dark" | "light") => {
    setTheme(newTheme)
    const settings = await getSettings()
    await setStorage("settings", { ...settings, theme: newTheme })
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
      <div className="w-[320px] h-[200px] flex items-center justify-center bg-[#0D0D0D]">
        <div className="w-6 h-6 border-2 border-[#333] border-t-indigo-500 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <ExtensionPopup
      theme={theme}
      isConnected={isConnected}
      isPro={isPro}
      savesToday={savesToday}
      dailyLimit={10}
      widgetEnabled={widgetEnabled}
      workspaceName={workspaceName}
      showSettings={showSettings}
      onToggleWidget={handleToggleWidget}
      onReconnect={handleReconnect}
      onDisconnect={handleDisconnect}
      onThemeChange={handleThemeChange}
      onOpenSettings={handleOpenSettings}
      onCloseSettings={() => setShowSettings(false)}
    />
  )
}

export default IndexPopup
