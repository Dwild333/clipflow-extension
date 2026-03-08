import { useState, useEffect } from 'react'
import { Settings, Power, ChevronRight, Clock, Zap, ExternalLink, Moon, Sun, Crown, CreditCard, Trash2, Search, ChevronDown, Check } from 'lucide-react'
import { ClipperLogo } from './ClipperLogo'
import { PageIcon } from './PageIcon'

interface ExtensionPopupProps {
  theme?: 'dark' | 'light'
  isConnected?: boolean
  isPro?: boolean
  savesToday?: number
  dailyLimit?: number
  widgetEnabled?: boolean
  workspaceName?: string | null
  showSettings?: boolean
  autoDismiss?: boolean
  dismissTimer?: number
  includeSourceUrl?: boolean
  includeDateTime?: boolean
  includeStamp?: boolean
  includeDatabases?: boolean
  defaultDestinationMode?: 'fixed' | 'last-saved'
  defaultDestinationId?: string | null
  defaultDestinationName?: string
  defaultDestinationEmoji?: string
  defaultDestinationIconUrl?: string | null
  defaultDestinationType?: 'page' | 'database'
  newPageParentId?: string | null
  newPageParentName?: string
  newPageParentEmoji?: string
  newPageParentIconUrl?: string | null
  newPageParentType?: 'page' | 'database'
  onToggleWidget?: (enabled: boolean) => void
  onOpenSettings?: () => void
  onCloseSettings?: () => void
  onThemeChange?: (theme: 'dark' | 'light') => void
  onSettingToggle?: (key: 'autoDismiss' | 'includeSourceUrl' | 'includeDateTime' | 'includeStamp' | 'includeDatabases', value: boolean) => void
  onDismissTimerChange?: (value: number) => void
  onDefaultDestinationModeChange?: (mode: 'fixed' | 'last-saved') => void
  onDefaultDestinationChange?: (page: { id: string; emoji: string; iconUrl?: string; name: string }) => void
  onNewPageParentChange?: (page: { id: string; emoji: string; iconUrl?: string; name: string }) => void
  onDisconnect?: () => void
  onReconnect?: () => void
  onActivateLicense?: () => void
}

interface RecentSave {
  id: string
  preview: string
  destination: string
  destinationId: string
  destinationEmoji: string
  destinationIconUrl?: string
  timeAgo: string
  sourceUrl?: string
}

function timeAgo(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export function ExtensionPopup({
  theme = 'dark',
  isConnected = true,
  isPro = false,
  savesToday = 7,
  dailyLimit = 75,
  widgetEnabled = true,
  workspaceName,
  showSettings = false,
  autoDismiss = false,
  dismissTimer = 5,
  includeSourceUrl = false,
  includeDateTime = false,
  includeStamp = false,
  includeDatabases = false,
  defaultDestinationMode = 'fixed',
  defaultDestinationId = null,
  defaultDestinationName = 'Choose a page',
  defaultDestinationEmoji = '📝',
  defaultDestinationIconUrl = null,
  defaultDestinationType = 'page',
  newPageParentId = null,
  newPageParentName = 'Choose a parent page',
  newPageParentEmoji = '📄',
  newPageParentIconUrl = null,
  newPageParentType = 'page',
  onToggleWidget,
  onOpenSettings,
  onCloseSettings,
  onThemeChange,
  onSettingToggle,
  onDismissTimerChange,
  onDefaultDestinationModeChange,
  onDefaultDestinationChange,
  onNewPageParentChange,
  onDisconnect,
  onReconnect,
  onActivateLicense,
}: ExtensionPopupProps) {
  const [enabled, setEnabled] = useState(widgetEnabled)
  const [recentSaves, setRecentSaves] = useState<RecentSave[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [showAllHistory, setShowAllHistory] = useState(false)
  const isDark = theme !== 'light'

  useEffect(() => {
    chrome.storage.local.get('recentSaves').then((result) => {
      const raw = result.recentSaves as Array<{ id: string; textPreview: string; destinationId: string; destinationName: string; destinationEmoji: string; destinationIconUrl?: string; savedAt: string; sourceUrl?: string }> | undefined
      if (!raw?.length) return
      setRecentSaves(raw.map(s => ({
        id: s.id,
        preview: s.textPreview,
        destination: s.destinationName,
        destinationId: s.destinationId,
        destinationEmoji: s.destinationEmoji,
        destinationIconUrl: s.destinationIconUrl,
        timeAgo: timeAgo(s.savedAt),
        sourceUrl: s.sourceUrl,
      })))
    })
  }, [])

  const handleToggle = () => {
    const newVal = !enabled
    setEnabled(newVal)
    onToggleWidget?.(newVal)
  }

  const handleDeleteSave = async (id: string) => {
    const raw = await chrome.storage.local.get('recentSaves')
    const all = (raw.recentSaves as Array<{ id: string }> | undefined) ?? []
    const updated = all.filter(s => s.id !== id)
    await chrome.storage.local.set({ recentSaves: updated })
    setRecentSaves(prev => prev.filter(s => s.id !== id))
    setConfirmDeleteId(null)
    setExpandedId(null)
  }

  const savesRemaining = dailyLimit - savesToday
  const savePercentage = (savesToday / dailyLimit) * 100

  if (showSettings) {
    return (
      <div
        className={`w-[320px] rounded-2xl border overflow-hidden ${isDark ? 'border-white/[0.08]' : 'border-black/[0.08]'}`}
        style={isDark ? { background: 'linear-gradient(180deg, rgba(28,28,32,0.99) 0%, rgba(14,14,18,0.99) 100%)' } : { background: 'linear-gradient(180deg, rgba(255,255,255,0.99) 0%, rgba(245,245,250,0.99) 100%)' }}
      >
        <SettingsView
          theme={theme}
          isPro={isPro}
          workspaceName={workspaceName}
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
          onBack={onCloseSettings!}
          onThemeChange={onThemeChange}
          onSettingToggle={onSettingToggle}
          onDismissTimerChange={onDismissTimerChange}
          onDefaultDestinationModeChange={onDefaultDestinationModeChange}
          onDefaultDestinationChange={onDefaultDestinationChange}
          onNewPageParentChange={onNewPageParentChange}
          onDisconnect={onDisconnect}
          onActivateLicense={onActivateLicense}
        />
      </div>
    )
  }

  return (
    <div
      className={`w-[320px] rounded-2xl border overflow-hidden ${isDark ? 'border-white/[0.08]' : 'border-black/[0.08]'}`}
      style={isDark ? { background: 'linear-gradient(180deg, rgba(28,28,32,0.99) 0%, rgba(14,14,18,0.99) 100%)' } : { background: 'linear-gradient(180deg, rgba(255,255,255,0.99) 0%, rgba(245,245,250,0.99) 100%)' }}
    >
      {/* Header */}
      <div className={`px-4 py-3 flex items-center justify-between border-b ${isDark ? 'border-white/10' : 'border-black/10'}`}>
        <div className="flex items-center gap-2.5">
          <ClipperLogo size={28} />
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className={`text-sm font-bold tracking-tight ${isDark ? 'text-white' : 'text-black'}`}>Clipper</span>
              <span className={`text-[10px] font-medium tracking-wide ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>by NotionFlow</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`} />
              <span className="text-[10px] text-gray-500">{isConnected ? 'Connected' : 'Disconnected'}</span>
              {isPro && (
                <span className="text-[9px] px-1.5 py-0.5 bg-indigo-500/20 text-indigo-400 rounded-full ml-1">PRO</span>
              )}
            </div>
          </div>
        </div>
        <button
          onClick={onOpenSettings}
          className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${isDark ? 'hover:bg-white/10' : 'hover:bg-black/5'}`}
        >
          <Settings className={`w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`} />
        </button>
      </div>

      {/* Not connected state */}
      {!isConnected ? (
        <div className="p-6 text-center">
          <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-3">
            <Power className="w-5 h-5 text-red-400" />
          </div>
          <p className={`text-sm mb-1 ${isDark ? 'text-white' : 'text-black'}`}>Not connected to Notion</p>
          <p className="text-xs text-gray-500 mb-4">Connect your workspace to start saving</p>
          <button
            onClick={onReconnect}
            className="w-full h-9 bg-gradient-to-b from-violet-500 to-indigo-600 hover:brightness-110 shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] text-white text-sm rounded-lg transition-all"
          >
            Connect to Notion
          </button>
        </div>
      ) : (
        <>
          {/* Widget Toggle */}
          <div className={`mx-4 mt-4 p-3 rounded-xl flex items-center justify-between ${isDark ? 'bg-white/[0.05]' : 'bg-gray-50'}`}>
            <div className="flex items-center gap-2.5">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${enabled ? 'bg-indigo-500/20 text-indigo-400' : isDark ? 'bg-white/5 text-gray-600' : 'bg-gray-200 text-gray-400'}`}>
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <div className={`text-sm ${isDark ? 'text-white' : 'text-black'}`}>Widget {enabled ? 'Active' : 'Paused'}</div>
                <div className="text-[10px] text-gray-500">{enabled ? 'Shows on copy' : 'Click to enable'}</div>
              </div>
            </div>
            <button
              onClick={handleToggle}
              className={`relative w-11 h-6 rounded-full transition-all ${enabled ? 'bg-gradient-to-b from-violet-500 to-indigo-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]' : isDark ? 'bg-gray-700' : 'bg-gray-300'}`}
            >
              <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow-sm ${enabled ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
            </button>
          </div>

          {/* Usage Stats (Free tier only) */}
          {!isPro && (
            <div className={`mx-4 mt-3 rounded-xl p-3 ${isDark ? 'bg-white/[0.05]' : 'bg-gray-50'}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-baseline gap-1">
                  <span className={`text-base font-bold ${savePercentage >= 90 ? 'text-red-400' : savePercentage >= 70 ? 'text-amber-400' : isDark ? 'text-white' : 'text-black'}`}>{savesToday}</span>
                  <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>/ {dailyLimit} saves this month</span>
                </div>
                <span className={`text-xs font-medium ${savesRemaining <= 5 ? 'text-amber-400' : isDark ? 'text-gray-400' : 'text-gray-500'}`}>{savesRemaining} left</span>
              </div>
              <div className={`h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-white/[0.06]' : 'bg-gray-200'}`}>
                <div
                  className={`h-full rounded-full transition-all ${savePercentage >= 90 ? 'bg-red-500' : savePercentage >= 70 ? 'bg-amber-500' : 'bg-indigo-500'}`}
                  style={{ width: `${Math.min(savePercentage, 100)}%` }}
                />
              </div>
            </div>
          )}

          {/* Save History */}
          <div className="mt-4">
            <div className="flex items-center justify-between px-4 mb-2">
              <span className="text-[10px] uppercase tracking-wider text-gray-500">Save History ({recentSaves.length})</span>
              {recentSaves.length > 5 ? (
                <button
                  onClick={() => setShowAllHistory(v => !v)}
                  className="text-[10px] text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  {showAllHistory ? `Show less` : `Show all ${recentSaves.length}`}
                </button>
              ) : (
                <Clock className="w-3 h-3 text-gray-600" />
              )}
            </div>
            {recentSaves.length === 0 ? (
              <div className="mx-4 py-4 text-center text-xs text-gray-600">No saves yet — copy some text to get started</div>
            ) : (
            <div className={`mx-2 mb-3 rounded-xl border overflow-hidden ${isDark ? 'bg-white/[0.06] border-white/[0.08]' : 'bg-gray-50 border-black/[0.06]'}`}>
              <div className={showAllHistory ? 'max-h-[400px] overflow-y-auto' : ''}>
                {(showAllHistory ? recentSaves : recentSaves.slice(0, 5)).map((save, index) => (
                  <div key={save.id} className={index < recentSaves.length - 1 ? isDark ? 'border-b border-white/5' : 'border-b border-black/5' : ''}>
                  <button
                    onClick={() => { setExpandedId(expandedId === save.id ? null : save.id); setConfirmDeleteId(null) }}
                    className={`w-full px-3 py-2.5 flex items-start gap-2.5 text-left transition-colors ${isDark ? 'hover:bg-white/5' : 'hover:bg-gray-100'}`}
                  >
                    <div className="mt-0.5 shrink-0">
                      <PageIcon emoji={save.destinationEmoji} iconUrl={save.destinationIconUrl} size={16} type={(save as any).destinationType} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`text-xs ${expandedId === save.id ? 'whitespace-pre-wrap break-words' : 'truncate'} ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        {save.preview}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <a
                          href={`https://notion.so/${save.destinationId?.replace(/-/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          onClick={e => e.stopPropagation()}
                          className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-0.5 transition-colors shrink-0"
                        >
                          {save.destination}
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                        {save.sourceUrl && (
                          <>
                            <span className="text-[10px] text-gray-600">·</span>
                            <a
                              href={save.sourceUrl}
                              target="_blank"
                              rel="noreferrer"
                              onClick={e => e.stopPropagation()}
                              className="text-[10px] text-gray-500 hover:text-gray-400 flex items-center gap-0.5 transition-colors shrink-0"
                            >
                              source <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          </>
                        )}
                        <span className="text-[10px] text-gray-400 ml-auto shrink-0">{save.timeAgo}</span>
                      </div>
                    </div>
                    <span className="text-[10px] text-gray-600 shrink-0 mt-0.5">{expandedId === save.id ? '▲' : '▼'}</span>
                  </button>
                  {expandedId === save.id && (
                    <div className="px-3 pb-2 flex items-center justify-end gap-2">
                      {confirmDeleteId === save.id ? (
                        <>
                          <span className={`text-[10px] ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Delete this entry?</span>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className={`px-2 py-0.5 text-[10px] rounded transition-colors ${isDark ? 'text-gray-400 hover:text-white hover:bg-white/10' : 'text-gray-500 hover:text-black hover:bg-black/5'}`}
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleDeleteSave(save.id)}
                            className="px-2 py-0.5 text-[10px] rounded bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                          >
                            Yes, delete
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => setConfirmDeleteId(save.id)}
                          className={`flex items-center gap-1 px-2 py-0.5 text-[10px] rounded transition-colors ${isDark ? 'text-gray-600 hover:text-red-400 hover:bg-red-500/10' : 'text-gray-400 hover:text-red-500 hover:bg-red-50'}`}
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Delete</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
                ))}
              </div>
            </div>
            )}
          </div>

          {/* Upgrade CTA (Free) / Pro status banner */}
          <div className="mx-4 mt-3">
            {isPro ? (
              <div className={`w-full px-3 py-2.5 rounded-xl flex items-center gap-2 ${isDark ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-amber-50 border border-amber-200'}`}>
                <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="text-xs text-amber-400 font-medium">Pro plan — unlimited saves</span>
              </div>
            ) : (
              <a
                href="https://www.notionflow.io/#pricing"
                target="_blank"
                rel="noreferrer"
                className={`w-full px-3 py-2.5 rounded-xl flex items-center justify-between transition-colors ${isDark ? 'bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20' : 'bg-indigo-50 hover:bg-indigo-100 border border-indigo-200'}`}
              >
                <div className="flex items-center gap-2">
                  <Zap className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="text-xs text-indigo-400">Upgrade to Pro — unlimited saves</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-indigo-400" />
              </a>
            )}
          </div>

          {/* Footer */}
          <div className={`mt-4 px-4 py-2.5 flex items-center justify-between border-t ${isDark ? 'border-white/5' : 'border-black/5'}`}>
            <span className="text-[10px] text-gray-600">v1.0.0</span>
            <a
              href="https://notionflow.io/clipper/support"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 text-[10px] text-gray-500 hover:text-gray-400 transition-colors"
            >
              <span>Help & Feedback</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </div>
        </>
      )}
    </div>
  )
}

// ─── Inline Settings View ─────────────────────────────────────────────────────

interface NotionPageLite { id: string; emoji: string; iconUrl?: string; name: string; type?: 'page' | 'database' }

interface SettingsViewProps {
  theme?: 'dark' | 'light'
  isPro?: boolean
  workspaceName?: string | null
  autoDismiss?: boolean
  dismissTimer?: number
  includeSourceUrl?: boolean
  includeDateTime?: boolean
  includeStamp?: boolean
  includeDatabases?: boolean
  defaultDestinationMode?: 'fixed' | 'last-saved'
  defaultDestinationId?: string | null
  defaultDestinationName?: string
  defaultDestinationEmoji?: string
  defaultDestinationIconUrl?: string | null
  defaultDestinationType?: 'page' | 'database'
  newPageParentId?: string | null
  newPageParentName?: string
  newPageParentEmoji?: string
  newPageParentIconUrl?: string | null
  newPageParentType?: 'page' | 'database'
  onBack: () => void
  onThemeChange?: (theme: 'dark' | 'light') => void
  onSettingToggle?: (key: 'autoDismiss' | 'includeSourceUrl' | 'includeDateTime' | 'includeStamp' | 'includeDatabases', value: boolean) => void
  onDismissTimerChange?: (value: number) => void
  onDefaultDestinationModeChange?: (mode: 'fixed' | 'last-saved') => void
  onDefaultDestinationChange?: (page: NotionPageLite) => void
  onNewPageParentChange?: (page: NotionPageLite) => void
  onDisconnect?: () => void
  onActivateLicense?: () => void
}

function Toggle({ on, onToggle, isDark }: { on: boolean; onToggle: () => void; isDark: boolean }) {
  return (
    <button
      onClick={onToggle}
      className={`relative w-11 h-6 rounded-full transition-all shrink-0 ${on ? 'bg-gradient-to-b from-violet-500 to-indigo-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]' : isDark ? 'bg-gray-600' : 'bg-gray-300'}`}
    >
      <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform ${on ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
    </button>
  )
}

function SettingsRow({ label, desc, isDark, children }: { label: string; desc: string; isDark: boolean; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <div className={`text-sm font-medium ${isDark ? 'text-white' : 'text-black'}`}>{label}</div>
        <div className="text-xs text-gray-500 mt-0.5">{desc}</div>
      </div>
      {children}
    </div>
  )
}

function SettingsView({
  theme = 'dark',
  isPro = false,
  workspaceName,
  autoDismiss = false,
  dismissTimer = 5,
  includeSourceUrl = false,
  includeDateTime = false,
  includeStamp = false,
  includeDatabases = false,
  defaultDestinationMode = 'fixed',
  defaultDestinationId = null,
  defaultDestinationName = 'Choose a page',
  defaultDestinationEmoji = '📝',
  defaultDestinationIconUrl = null,
  defaultDestinationType = 'page',
  newPageParentId = null,
  newPageParentName = 'Not set',
  newPageParentEmoji = '📄',
  newPageParentIconUrl = null,
  newPageParentType = 'page',
  onBack,
  onThemeChange,
  onSettingToggle,
  onDismissTimerChange,
  onDefaultDestinationModeChange,
  onDefaultDestinationChange,
  onNewPageParentChange,
  onDisconnect,
  onActivateLicense,
}: SettingsViewProps) {
  const isDark = theme !== 'light'
  const [confirmDisconnect, setConfirmDisconnect] = useState(false)
  const [emailInput, setEmailInput] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [verifyError, setVerifyError] = useState<string | null>(null)
  const [verifySuccess, setVerifySuccess] = useState(false)

  // Destination picker state
  const [showDestPicker, setShowDestPicker] = useState(false)
  const [destSearch, setDestSearch] = useState('')
  const [destPages, setDestPages] = useState<NotionPageLite[]>([])
  const [destLoading, setDestLoading] = useState(false)

  // New page location picker state
  const [showParentPicker, setShowParentPicker] = useState(false)
  const [parentSearch, setParentSearch] = useState('')
  const [parentPages, setParentPages] = useState<NotionPageLite[]>([])
  const [parentLoading, setParentLoading] = useState(false)

  const loadPages = async (query: string, setPages: (p: NotionPageLite[]) => void, setLoading: (v: boolean) => void) => {
    setLoading(true)
    try {
      const res = await chrome.runtime.sendMessage({ type: 'SEARCH_PAGES', query }) as { success: boolean; pages?: NotionPageLite[] }
      setPages(res?.pages ?? [])
    } catch { setPages([]) }
    setLoading(false)
  }

  useEffect(() => { if (showDestPicker && destPages.length === 0) loadPages('', setDestPages, setDestLoading) }, [showDestPicker])
  useEffect(() => { if (showParentPicker && parentPages.length === 0) loadPages('', setParentPages, setParentLoading) }, [showParentPicker])

  const handleVerify = async () => {
    const email = emailInput.trim().toLowerCase()
    if (!email) return
    setVerifying(true)
    setVerifyError(null)
    try {
      const res = await fetch('https://www.notionflow.io/api/license/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, app_id: 'clipper' }),
      })
      const data = await res.json() as { is_pro: boolean; plan: string | null; current_period_end: string | null; error?: string }
      if (!res.ok) throw new Error(data.error ?? 'Verification failed')
      if (!data.is_pro) {
        setVerifyError('No active Pro subscription found for this email.')
      } else {
        await chrome.storage.local.set({
          license: {
            email,
            is_pro: true,
            plan: data.plan,
            verified_at: Date.now(),
            expires_at: data.current_period_end ? new Date(data.current_period_end).getTime() : 0,
          },
        })
        setEmailInput('')
        setVerifySuccess(true)
        onActivateLicense?.()
      }
    } catch (err) {
      setVerifyError(err instanceof Error ? err.message : 'Could not connect — check your internet connection')
    } finally {
      setVerifying(false)
    }
  }

  const handleManageSubscription = async () => {
    const result = await chrome.storage.local.get('license')
    const email = result?.license?.email
    if (!email) return
    try {
      const res = await fetch('https://www.notionflow.io/api/stripe/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, app_id: 'clipper' }),
      })
      const data = await res.json() as { url: string }
      chrome.tabs.create({ url: data.url })
    } catch {
      // fallback
      chrome.tabs.create({ url: 'https://www.notionflow.io/account' })
    }
  }
  return (
    <>
      <div className={`px-4 py-3 flex items-center gap-2 border-b ${isDark ? 'border-white/10' : 'border-black/10'}`}>
        <button
          onClick={onBack}
          className={`flex items-center gap-2 text-sm font-semibold transition-colors ${isDark ? 'text-white hover:text-gray-300' : 'text-black hover:text-gray-700'}`}
        >
          <ChevronRight className="w-4 h-4 rotate-180" />
          <span>Settings</span>
        </button>
      </div>

      <div className="overflow-y-auto max-h-[480px]">
        <div className="p-4 space-y-5">

          {/* Appearance */}
          <section>
            <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-3">Appearance</div>
            <SettingsRow label="Theme" desc={isDark ? 'Dark mode' : 'Light mode'} isDark={isDark}>
              <button
                onClick={() => onThemeChange?.(theme === 'dark' ? 'light' : 'dark')}
                className={`relative w-11 h-6 rounded-full transition-all shrink-0 ${isDark ? 'bg-gradient-to-b from-violet-500 to-indigo-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]' : 'bg-gray-300'}`}
              >
                <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform flex items-center justify-center ${isDark ? 'translate-x-[22px]' : 'translate-x-0.5'}`}>
                  {isDark
                    ? <Moon className="w-3 h-3 text-indigo-500" />
                    : <Sun className="w-3 h-3 text-gray-500" />}
                </div>
              </button>
            </SettingsRow>
          </section>

          <div className={`border-t ${isDark ? 'border-white/10' : 'border-black/10'}`} />

          {/* Save Options */}
          <section className="space-y-4">
            <div className="text-[10px] uppercase tracking-wider text-gray-500">Save Options</div>
            <SettingsRow label="Include source URL" desc="Append page URL below saved text" isDark={isDark}>
              <Toggle on={includeSourceUrl} onToggle={() => onSettingToggle?.('includeSourceUrl', !includeSourceUrl)} isDark={isDark} />
            </SettingsRow>
            <SettingsRow label="Include date & time" desc="Append timestamp below saved text" isDark={isDark}>
              <Toggle on={includeDateTime} onToggle={() => onSettingToggle?.('includeDateTime', !includeDateTime)} isDark={isDark} />
            </SettingsRow>
            <SettingsRow label="Clipper stamp" desc="Append 'Saved with Clipper by NotionFlow'" isDark={isDark}>
              <Toggle on={includeStamp} onToggle={() => onSettingToggle?.('includeStamp', !includeStamp)} isDark={isDark} />
            </SettingsRow>
          </section>

          <div className={`border-t ${isDark ? 'border-white/10' : 'border-black/10'}`} />

          {/* Behaviour */}
          <section className="space-y-3">
            <div className="text-[10px] uppercase tracking-wider text-gray-500">Behaviour</div>
            <SettingsRow label="Auto-dismiss" desc="Close widget after inactivity" isDark={isDark}>
              <Toggle on={autoDismiss} onToggle={() => onSettingToggle?.('autoDismiss', !autoDismiss)} isDark={isDark} />
            </SettingsRow>
            {autoDismiss && (
              <div>
                <div className="text-xs text-gray-500 mb-2">Dismiss after {dismissTimer}s</div>
                <input
                  type="range" min="3" max="10" value={dismissTimer}
                  onChange={(e) => onDismissTimerChange?.(Number(e.target.value))}
                  className={`w-full h-2 rounded-lg appearance-none cursor-pointer
                    [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4
                    [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full
                    [&::-webkit-slider-thumb]:bg-gradient-to-b [&::-webkit-slider-thumb]:from-violet-500 [&::-webkit-slider-thumb]:to-indigo-600
                    ${isDark ? 'bg-[#2A2A2A]' : 'bg-gray-200'}`}
                />
              </div>
            )}
          </section>

          <div className={`border-t ${isDark ? 'border-white/10' : 'border-black/10'}`} />

          {/* Default Destination */}
          <section className="space-y-2">
            <div className="text-[10px] uppercase tracking-wider text-gray-500">Default Destination</div>
            <div className={`flex rounded-lg overflow-hidden border ${isDark ? 'border-white/10' : 'border-black/10'}`}>
              <button
                onClick={() => onDefaultDestinationModeChange?.('fixed')}
                className={`flex-1 h-8 text-xs font-medium transition-colors ${
                  defaultDestinationMode === 'fixed' ? 'bg-gradient-to-b from-violet-500 to-indigo-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] text-white' : isDark ? 'bg-white/[0.06] text-gray-400 hover:text-white' : 'bg-gray-100 text-gray-500 hover:text-black'
                }`}
              >Fixed page</button>
              <button
                onClick={() => onDefaultDestinationModeChange?.('last-saved')}
                className={`flex-1 h-8 text-xs font-medium transition-colors ${
                  defaultDestinationMode === 'last-saved' ? 'bg-gradient-to-b from-violet-500 to-indigo-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] text-white' : isDark ? 'bg-white/[0.06] text-gray-400 hover:text-white' : 'bg-gray-100 text-gray-500 hover:text-black'
                }`}
              >Last saved</button>
            </div>
            {defaultDestinationMode === 'last-saved' ? (
              <div className={`px-3 py-2 rounded-lg text-xs ${isDark ? 'bg-white/[0.04] text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
                Pre-fills with the last page you saved to.
              </div>
            ) : (
              <div className="space-y-1.5">
                <button
                  onClick={() => setShowDestPicker(v => !v)}
                  className={`w-full h-10 px-3 flex items-center justify-between rounded-lg transition-colors ${isDark ? 'bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.07]' : 'bg-gray-100 hover:bg-gray-200'}`}
                >
                  <div className="flex items-center gap-2">
                    <PageIcon emoji={defaultDestinationEmoji} iconUrl={defaultDestinationIconUrl ?? undefined} size={16} type={defaultDestinationType} />
                    <span className={`text-sm truncate ${defaultDestinationId ? (isDark ? 'text-white' : 'text-black') : 'text-gray-500'}`}>{defaultDestinationName}</span>
                  </div>
                  <ChevronDown className={`w-4 h-4 shrink-0 transition-transform ${isDark ? 'text-gray-400' : 'text-gray-600'} ${showDestPicker ? 'rotate-180' : ''}`} />
                </button>
                {showDestPicker && (
                  <div className={`border rounded-lg overflow-hidden ${isDark ? 'bg-black/[0.3] border-white/[0.08]' : 'bg-white border-black/10'}`}>
                    <div className={`px-2 py-2 border-b ${isDark ? 'border-white/[0.08]' : 'border-black/10'}`}>
                      <div className="relative">
                        <Search className={`absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                        <input type="text" value={destSearch} onChange={e => setDestSearch(e.target.value)} placeholder="Search pages..."
                          className={`w-full h-8 pl-8 pr-3 rounded-md text-xs outline-none ${isDark ? 'bg-white/[0.06] text-white placeholder:text-gray-600' : 'bg-gray-100 text-black placeholder:text-gray-500'}`}
                        />
                      </div>
                    </div>
                    <div className="max-h-[160px] overflow-y-auto">
                      {destLoading ? (
                        <div className="flex justify-center py-4"><div className={`w-4 h-4 border-2 rounded-full animate-spin ${isDark ? 'border-gray-600 border-t-white' : 'border-gray-300 border-t-black'}`} /></div>
                      ) : (destSearch ? destPages.filter(p => p.name.toLowerCase().includes(destSearch.toLowerCase())) : destPages).map(page => (
                        <button key={page.id} onClick={() => { onDefaultDestinationChange?.(page); setShowDestPicker(false); setDestSearch('') }}
                          className={`w-full h-9 px-3 flex items-center gap-2 transition-colors ${
                            defaultDestinationId === page.id ? (isDark ? 'bg-indigo-500/20' : 'bg-indigo-50') : isDark ? 'hover:bg-white/[0.06]' : 'hover:bg-gray-100'
                          }`}
                        >
                          <PageIcon emoji={page.emoji} iconUrl={page.iconUrl} size={16} type={page.type} />
                          <span className={`text-sm truncate flex-1 text-left ${isDark ? 'text-white' : 'text-black'}`}>{page.name}</span>
                          {defaultDestinationId === page.id && <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" />}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>

          <div className={`border-t ${isDark ? 'border-white/10' : 'border-black/10'}`} />

          {/* New Page Location */}
          <section className="space-y-2">
            <div className="text-[10px] uppercase tracking-wider text-gray-500">New Page Location</div>
            <div className="text-xs text-gray-500">Where new pages are created by default</div>
            <button
              onClick={() => setShowParentPicker(v => !v)}
              className={`w-full h-10 px-3 flex items-center justify-between rounded-lg transition-colors ${isDark ? 'bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.07]' : 'bg-gray-100 hover:bg-gray-200'}`}
            >
              <div className="flex items-center gap-2">
                <PageIcon emoji={newPageParentEmoji} iconUrl={newPageParentIconUrl ?? undefined} size={16} type={newPageParentType} />
                <span className={`text-sm truncate ${newPageParentId ? (isDark ? 'text-white' : 'text-black') : 'text-gray-500'}`}>{newPageParentId ? newPageParentName : 'Not set — tap to choose'}</span>
              </div>
              <ChevronDown className={`w-4 h-4 shrink-0 transition-transform ${isDark ? 'text-gray-400' : 'text-gray-600'} ${showParentPicker ? 'rotate-180' : ''}`} />
            </button>
            {showParentPicker && (
              <div className={`border rounded-lg overflow-hidden ${isDark ? 'bg-black/[0.3] border-white/[0.08]' : 'bg-white border-black/10'}`}>
                <div className={`px-2 py-2 border-b ${isDark ? 'border-white/[0.08]' : 'border-black/10'}`}>
                  <div className="relative">
                    <Search className={`absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                    <input type="text" value={parentSearch} onChange={e => setParentSearch(e.target.value)} placeholder="Search pages..."
                      className={`w-full h-8 pl-8 pr-3 rounded-md text-xs outline-none ${isDark ? 'bg-white/[0.06] text-white placeholder:text-gray-600' : 'bg-gray-100 text-black placeholder:text-gray-500'}`}
                    />
                  </div>
                </div>
                <div className="max-h-[160px] overflow-y-auto">
                  {parentLoading ? (
                    <div className="flex justify-center py-4"><div className={`w-4 h-4 border-2 rounded-full animate-spin ${isDark ? 'border-gray-600 border-t-white' : 'border-gray-300 border-t-black'}`} /></div>
                  ) : (parentSearch ? parentPages.filter(p => p.name.toLowerCase().includes(parentSearch.toLowerCase())) : parentPages).map(page => (
                    <button key={page.id} onClick={() => { onNewPageParentChange?.(page); setShowParentPicker(false); setParentSearch('') }}
                      className={`w-full h-9 px-3 flex items-center gap-2 transition-colors ${
                        newPageParentId === page.id ? (isDark ? 'bg-indigo-500/20' : 'bg-indigo-50') : isDark ? 'hover:bg-white/[0.06]' : 'hover:bg-gray-100'
                      }`}
                    >
                      <PageIcon emoji={page.emoji} iconUrl={page.iconUrl} size={16} type={page.type} />
                      <span className={`text-sm truncate flex-1 text-left ${isDark ? 'text-white' : 'text-black'}`}>{page.name}</span>
                      {newPageParentId === page.id && <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>

          <div className={`border-t ${isDark ? 'border-white/10' : 'border-black/10'}`} />

          {/* Advanced (Pro) */}
          <section className="space-y-3">
            <div className="text-[10px] uppercase tracking-wider text-gray-500">Advanced {!isPro && '(Pro)'}</div>
            <SettingsRow 
              label="Include databases" 
              desc="Show databases alongside pages (marked with a blue dot)" 
              isDark={isDark}
            >
              {isPro ? (
                <Toggle on={includeDatabases} onToggle={() => onSettingToggle?.('includeDatabases', !includeDatabases)} isDark={isDark} />
              ) : (
                <div className="relative">
                  <Toggle on={false} onToggle={() => {}} isDark={isDark} />
                  <div className="absolute inset-0 cursor-not-allowed" onClick={() => window.open('https://www.notionflow.io/#pricing', '_blank')} />
                </div>
              )}
            </SettingsRow>
            {!isPro && (
              <div className={`px-3 py-2 rounded-lg text-xs ${isDark ? 'bg-white/[0.04] text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
                Upgrade to Pro to enable database support. New pages will be created in databases with auto-generated titles.
              </div>
            )}
          </section>

          <div className={`border-t ${isDark ? 'border-white/10' : 'border-black/10'}`} />

          {/* Subscription */}
          <section className="space-y-3">
            <div className="text-[10px] uppercase tracking-wider text-gray-500">Subscription</div>
            <div className={`rounded-lg p-3 ${isDark ? 'bg-[#1A1A1A]' : 'bg-gray-100'}`}>
              {isPro ? (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Crown className="w-4 h-4 text-amber-400 shrink-0" />
                      <div>
                        <div className={`text-sm font-medium ${isDark ? 'text-white' : 'text-black'}`}>Pro Plan</div>
                        <div className="text-gray-500 text-xs">Unlimited saves</div>
                      </div>
                    </div>
                    <button
                      onClick={handleManageSubscription}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs text-indigo-400 hover:bg-indigo-500/10 rounded transition-colors"
                    >
                      <CreditCard className="w-3 h-3" />
                      <span>Manage</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className={`text-sm font-medium ${isDark ? 'text-white' : 'text-black'}`}>Free Plan</div>
                      <div className="text-gray-500 text-xs">75 saves / month</div>
                    </div>
                    <a
                      href="https://www.notionflow.io/#pricing"
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 px-3 py-1.5 text-xs text-indigo-400 hover:bg-indigo-500/10 rounded transition-colors"
                    >
                      <Zap className="w-3 h-3" />
                      <span>Upgrade</span>
                    </a>
                  </div>
                  <div className={`border-t pt-3 ${isDark ? 'border-white/10' : 'border-black/10'}`}>
                    <div className={`text-[11px] mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Already purchased? Enter your email:</div>
                    <div className="flex gap-2">
                      <input
                        type="email"
                        value={emailInput}
                        onChange={e => { setEmailInput(e.target.value); setVerifyError(null) }}
                        onKeyDown={e => e.key === 'Enter' && handleVerify()}
                        placeholder="you@email.com"
                        className={`flex-1 h-8 px-2.5 rounded-md text-xs outline-none border transition-colors ${
                          isDark
                            ? 'bg-[#0D0D0D] border-white/10 text-white placeholder:text-gray-600 focus:border-indigo-500/50'
                            : 'bg-white border-black/10 text-black placeholder:text-gray-400 focus:border-indigo-400'
                        }`}
                      />
                      <button
                        onClick={handleVerify}
                        disabled={verifying || !emailInput.trim()}
                        className="h-8 px-3 text-xs font-medium bg-indigo-500 hover:brightness-110 disabled:opacity-50 text-white rounded-md transition-all flex items-center gap-1.5"
                      >
                        {verifying ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Verify'}
                      </button>
                    </div>
                    {verifyError && <div className="mt-2 text-[11px] text-red-400">{verifyError}</div>}
                    {verifySuccess && (
                      <div className={`mt-2 px-3 py-2.5 rounded-lg ${isDark ? 'bg-green-500/10 border border-green-500/20' : 'bg-green-50 border border-green-200'}`}>
                        <div className="text-[11px] text-green-400 font-medium mb-1">✓ Pro activated!</div>
                        <div className={`text-[11px] ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Close and reopen the extension to see your Pro status.</div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </section>

          <div className={`border-t ${isDark ? 'border-white/10' : 'border-black/10'}`} />

          {/* Connected Workspace */}
          <section>
            <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-3">Connected Workspace</div>
            <div className={`rounded-lg overflow-hidden ${isDark ? 'bg-[#2A2A2A]' : 'bg-gray-100'}`}>
              <div className="flex items-center justify-between px-3 py-2.5">
                <div>
                  <div className={`text-sm font-medium ${isDark ? 'text-white' : 'text-black'}`}>{workspaceName || 'My Workspace'}</div>
                  <div className="text-gray-500 text-xs">Connected</div>
                </div>
                {!confirmDisconnect && (
                  <button
                    onClick={() => setConfirmDisconnect(true)}
                    className="px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10 rounded transition-colors"
                  >
                    Disconnect
                  </button>
                )}
              </div>
              {confirmDisconnect && (
                <div className={`px-3 py-2.5 border-t flex items-center justify-between gap-2 ${isDark ? 'border-white/10 bg-red-500/5' : 'border-black/10 bg-red-50'}`}>
                  <span className={`text-xs ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Remove this workspace?</span>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => setConfirmDisconnect(false)}
                      className={`px-3 py-1.5 text-xs rounded-md transition-colors ${isDark ? 'text-gray-400 hover:text-white hover:bg-white/10' : 'text-gray-500 hover:text-black hover:bg-black/10'}`}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={onDisconnect}
                      className="px-3 py-1.5 text-xs rounded-md bg-red-500 hover:bg-red-600 text-white transition-colors"
                    >
                      Disconnect
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>

        </div>
      </div>
    </>
  )
}
