import { useState, useEffect } from "react"
import "./popup.css"
import { ExtensionPopup } from "./components/ExtensionPopup"
import { OnboardingFlow } from "./components/OnboardingFlow"
import { getSettings, getStorage, setStorage } from "./lib/storage"

const CLIPPER_API_URL = process.env.PLASMO_PUBLIC_CLIPPER_API_URL!
const CLIPPER_API_KEY = process.env.PLASMO_PUBLIC_CLIPPER_API_KEY!

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
  const [includeDatabases, setIncludeDatabases] = useState(false)
  const [defaultDestinationMode, setDefaultDestinationMode] = useState<'fixed' | 'last-saved'>('fixed')
  const [defaultDestinationId, setDefaultDestinationId] = useState<string | null>(null)
  const [defaultDestinationName, setDefaultDestinationName] = useState('Choose a page')
  const [defaultDestinationEmoji, setDefaultDestinationEmoji] = useState('📝')
  const [defaultDestinationIconUrl, setDefaultDestinationIconUrl] = useState<string | null>(null)
  const [defaultDestinationType, setDefaultDestinationType] = useState<'page' | 'database'>('page')
  const [newPageParentId, setNewPageParentId] = useState<string | null>(null)
  const [newPageParentName, setNewPageParentName] = useState('Choose a parent page')
  const [newPageParentEmoji, setNewPageParentEmoji] = useState('📄')
  const [newPageParentIconUrl, setNewPageParentIconUrl] = useState<string | null>(null)
  const [newPageParentType, setNewPageParentType] = useState<'page' | 'database'>('page')
  const [loading, setLoading] = useState(true)
  const [workspaceName, setWorkspaceName] = useState<string | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [accountEmail, setAccountEmail] = useState("")

  async function loadState() {
    setLoading(true)

    const [localAuth, settings, usage, license] = await Promise.all([
      getStorage("auth"),
      getSettings(),
      getStorage("usage"),
      getStorage("license"),
    ])

    // Check Pro status via clipper-api (if we have an email)
    let resolvedPro = false
    const storedEmail = license?.email ?? ""
    setAccountEmail(storedEmail)

    if (storedEmail) {
      try {
        const res = await fetch(`${CLIPPER_API_URL}/api/verify-pro`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-api-key": CLIPPER_API_KEY },
          body: JSON.stringify({ email: storedEmail }),
        })
        if (res.ok) {
          const data = await res.json() as { is_pro: boolean }
          resolvedPro = data.is_pro
        }
      } catch {
        // Network failure — use cached status
        resolvedPro = !!license?.is_pro
      }

      await setStorage("license", {
        email: storedEmail,
        is_pro: resolvedPro,
        plan: null,
        verified_at: Date.now(),
        expires_at: 0,
      })
    }

    const connected = !!localAuth?.accessToken
    setIsConnected(connected)
    setWorkspaceName(localAuth?.workspaceName ?? null)
    setIsPro(resolvedPro)
    setTheme(settings.theme)
    setWidgetEnabled(settings.widgetEnabled)
    setAutoDismiss(settings.autoDismiss ?? false)
    setDismissTimer(settings.dismissTimer ?? 5)
    setIncludeSourceUrl(settings.includeSourceUrl ?? false)
    setIncludeDateTime(settings.includeDateTime ?? false)
    setIncludeStamp(settings.includeStamp ?? false)
    setIncludeDatabases(settings.includeDatabases ?? false)
    setDefaultDestinationMode(settings.defaultDestinationMode ?? 'fixed')
    setDefaultDestinationId(settings.defaultDestinationId ?? null)
    setDefaultDestinationName(settings.defaultDestinationName ?? 'Choose a page')
    setDefaultDestinationEmoji(settings.defaultDestinationEmoji ?? '📝')
    setDefaultDestinationIconUrl(settings.defaultDestinationIconUrl ?? null)
    setDefaultDestinationType(settings.defaultDestinationType ?? 'page')
    setNewPageParentId(settings.newPageParentId ?? null)
    setNewPageParentName(settings.newPageParentName ?? 'Choose a parent page')
    setNewPageParentEmoji(settings.newPageParentEmoji ?? '📄')
    setNewPageParentIconUrl(settings.newPageParentIconUrl ?? null)
    setNewPageParentType(settings.newPageParentType ?? 'page')

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

  // ─── Handlers ────────────────────────────────────────────────────────────────

  const handleToggleWidget = async (enabled: boolean) => {
    setWidgetEnabled(enabled)
    const settings = await getSettings()
    await chrome.storage.local.set({ settings: { ...settings, widgetEnabled: enabled } })
  }

  const handleReconnect = async () => {
    console.log('[Popup] Sending NOTION_CONNECT message...')
    const result = await chrome.runtime.sendMessage({ type: "NOTION_CONNECT" }) as { success: boolean; connection?: import("./lib/oauth").NotionOAuthResult; error?: string }
    console.log('[Popup] NOTION_CONNECT result:', result)
    if (result?.success) {
      await loadState()
    } else {
      console.error('[Popup] Notion connect failed:', result?.error)
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

  const handleDefaultDestinationChange = async (page: { id: string; emoji: string; iconUrl?: string; name: string; type?: 'page' | 'database' }) => {
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
      defaultDestinationType: page.type ?? 'page',
    })
  }

  const handleNewPageParentChange = async (page: { id: string; emoji: string; iconUrl?: string; name: string; type?: 'page' | 'database' }) => {
    setNewPageParentId(page.id)
    setNewPageParentName(page.name)
    setNewPageParentEmoji(page.emoji)
    setNewPageParentIconUrl(page.iconUrl ?? null)
    setNewPageParentType(page.type ?? 'page')
    const settings = await getSettings()
    await setStorage('settings', {
      ...settings,
      newPageParentId: page.id,
      newPageParentName: page.name,
      newPageParentEmoji: page.emoji,
      newPageParentIconUrl: page.iconUrl ?? null,
      newPageParentType: page.type ?? 'page',
    })
  }

  const handleSettingToggle = async (key: "autoDismiss" | "includeSourceUrl" | "includeDateTime" | "includeStamp" | "includeDatabases", value: boolean) => {
    if (key === "autoDismiss") setAutoDismiss(value)
    if (key === "includeSourceUrl") setIncludeSourceUrl(value)
    if (key === "includeDateTime") setIncludeDateTime(value)
    if (key === "includeStamp") setIncludeStamp(value)
    if (key === "includeDatabases") setIncludeDatabases(value)
    const settings = await getSettings()
    await setStorage("settings", { ...settings, [key]: value })
  }

  const handleDismissTimerChange = async (value: number) => {
    setDismissTimer(value)
    const settings = await getSettings()
    await setStorage("settings", { ...settings, dismissTimer: value })
  }

  const handleUpgrade = async (period: 'monthly' | 'yearly') => {
    try {
      const res = await fetch(`${CLIPPER_API_URL}/api/create-checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': CLIPPER_API_KEY },
        body: JSON.stringify({
          billing_period: period,
          app_id: 'clipper',
          email: accountEmail || undefined,
        }),
      })
      if (!res.ok) throw new Error('Failed to create checkout session')
      const { url } = await res.json() as { url: string }
      window.open(url, '_blank')
    } catch {
      window.open('https://www.notionflow.io/clipper/pricing', '_blank')
    }
  }

  const handleRestoreLicense = async (licenseKey: string): Promise<'activated' | 'not_found' | 'inactive' | 'error'> => {
    if (!accountEmail) return 'error'
    try {
      const res = await fetch(`${CLIPPER_API_URL}/api/restore-pro`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': CLIPPER_API_KEY },
        body: JSON.stringify({ license_key: licenseKey, email: accountEmail }),
      })
      if (res.status === 404) return 'not_found'
      if (res.status === 400) return 'inactive'
      if (res.status === 403) return 'not_found'
      if (!res.ok) return 'error'
      // Re-verify so isPro updates immediately
      const verifyRes = await fetch(`${CLIPPER_API_URL}/api/verify-pro`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': CLIPPER_API_KEY },
        body: JSON.stringify({ email: accountEmail }),
      })
      if (verifyRes.ok) {
        const data = await verifyRes.json() as { is_pro: boolean }
        if (data.is_pro) {
          setIsPro(true)
          await setStorage("license", {
            email: accountEmail,
            is_pro: true,
            plan: null,
            verified_at: Date.now(),
            expires_at: 0,
          })
          return 'activated'
        }
      }
      return 'not_found'
    } catch {
      return 'error'
    }
  }

  const handleRefreshLicense = async (emailOverride?: string): Promise<'activated' | 'not_found' | 'error'> => {
    const email = emailOverride || accountEmail
    if (!email) return 'error'
    try {
      const res = await fetch(`${CLIPPER_API_URL}/api/verify-pro`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': CLIPPER_API_KEY },
        body: JSON.stringify({ email }),
      })
      if (!res.ok) return 'error'
      const data = await res.json() as { is_pro: boolean }
      await setStorage("license", {
        email,
        is_pro: data.is_pro,
        plan: null,
        verified_at: Date.now(),
        expires_at: 0,
      })
      if (data.is_pro) {
        setIsPro(true)
        setAccountEmail(email)
        return 'activated'
      }
      return 'not_found'
    } catch {
      return 'error'
    }
  }

  const handleReset = async () => {
    await chrome.storage.local.remove(["auth", "license", "recentSaves", "usage", "onboardingComplete"])
    setIsConnected(false)
    setWorkspaceName(null)
    setIsPro(false)
    setAccountEmail("")
    setShowSettings(false)
  }

  const handleEmailUpdate = async (email: string) => {
    setAccountEmail(email)
    const license = await getStorage("license")
    await setStorage("license", {
      email,
      is_pro: license?.is_pro ?? false,
      plan: license?.plan ?? null,
      verified_at: license?.verified_at ?? Date.now(),
      expires_at: license?.expires_at ?? 0,
    })
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  const spinner = (
    <div className="w-[320px] h-[200px] flex items-center justify-center" style={{ background: 'linear-gradient(180deg, rgba(28,28,32,1) 0%, rgba(14,14,18,1) 100%)' }}>
      <div className="w-6 h-6 border-2 border-[#333] border-t-indigo-500 rounded-full animate-spin" />
    </div>
  )

  if (loading) return spinner

  if (showOnboarding) {
    return (
      <OnboardingFlow
        theme={theme}
        workspaceName={workspaceName}
        isPro={isPro}
        onComplete={() => setShowOnboarding(false)}
      />
    )
  }

  return (
    <ExtensionPopup
      theme={theme}
      isConnected={isConnected}
      isPro={isPro}
      savesToday={savesThisMonth}
      dailyLimit={50}
      widgetEnabled={widgetEnabled}
      workspaceName={workspaceName}
      showSettings={showSettings}
      autoDismiss={autoDismiss}
      dismissTimer={dismissTimer}
      includeSourceUrl={includeSourceUrl}
      includeDateTime={includeDateTime}
      includeStamp={includeStamp}
      includeDatabases={includeDatabases}
      defaultDestinationMode={defaultDestinationMode}
      defaultDestinationId={defaultDestinationId}
      defaultDestinationName={defaultDestinationName}
      defaultDestinationEmoji={defaultDestinationEmoji}
      defaultDestinationIconUrl={defaultDestinationIconUrl}
      defaultDestinationType={defaultDestinationType}
      newPageParentId={newPageParentId}
      newPageParentName={newPageParentName}
      newPageParentEmoji={newPageParentEmoji}
      newPageParentIconUrl={newPageParentIconUrl}
      newPageParentType={newPageParentType}
      onToggleWidget={handleToggleWidget}
      onReconnect={handleReconnect}
      onDisconnect={handleDisconnect}
      onThemeChange={handleThemeChange}
      onSettingToggle={handleSettingToggle}
      onDismissTimerChange={handleDismissTimerChange}
      onDefaultDestinationModeChange={handleDefaultDestinationModeChange}
      onDefaultDestinationChange={handleDefaultDestinationChange}
      onNewPageParentChange={handleNewPageParentChange}
      accountEmail={accountEmail}
      onSignOut={handleReset}
      onOpenSettings={() => setShowSettings(true)}
      onCloseSettings={() => setShowSettings(false)}
      onRefreshLicense={handleRefreshLicense}
      onRestoreLicense={handleRestoreLicense}
      onUpgrade={handleUpgrade}
      onEmailUpdate={handleEmailUpdate}
    />
  )
}

export default IndexPopup
