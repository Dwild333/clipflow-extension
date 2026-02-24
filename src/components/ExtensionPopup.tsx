import { useState, useEffect } from 'react'
import { Settings, Power, ChevronRight, Clock, Zap, ExternalLink, Moon, Sun } from 'lucide-react'
import { ClipFlowLogo } from './ClipFlowLogo'
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
  onToggleWidget?: (enabled: boolean) => void
  onOpenSettings?: () => void
  onCloseSettings?: () => void
  onThemeChange?: (theme: 'dark' | 'light') => void
  onSettingToggle?: (key: 'autoDismiss' | 'includeSourceUrl' | 'includeDateTime', value: boolean) => void
  onDismissTimerChange?: (value: number) => void
  onUpgrade?: () => void
  onDisconnect?: () => void
  onReconnect?: () => void
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
  dailyLimit = 10,
  widgetEnabled = true,
  workspaceName,
  showSettings = false,
  autoDismiss = false,
  dismissTimer = 5,
  includeSourceUrl = false,
  includeDateTime = false,
  onToggleWidget,
  onOpenSettings,
  onCloseSettings,
  onThemeChange,
  onSettingToggle,
  onDismissTimerChange,
  onUpgrade,
  onDisconnect,
  onReconnect,
}: ExtensionPopupProps) {
  const [enabled, setEnabled] = useState(widgetEnabled)
  const [recentSaves, setRecentSaves] = useState<RecentSave[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const isDark = theme !== 'light'

  useEffect(() => {
    chrome.storage.local.get('recentSaves').then((result) => {
      const raw = result.recentSaves as Array<{ id: string; textPreview: string; destinationId: string; destinationName: string; destinationEmoji: string; destinationIconUrl?: string; savedAt: string; sourceUrl?: string }> | undefined
      if (!raw?.length) return
      setRecentSaves(raw.slice(0, 5).map(s => ({
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

  const savesRemaining = dailyLimit - savesToday
  const savePercentage = (savesToday / dailyLimit) * 100

  if (showSettings) {
    return (
      <div className={`w-[320px] rounded-2xl border overflow-hidden ${isDark ? 'bg-[#1A1A1A] border-white/10' : 'bg-white border-black/10'}`}>
        <SettingsView
          theme={theme}
          workspaceName={workspaceName}
          autoDismiss={autoDismiss}
          dismissTimer={dismissTimer}
          includeSourceUrl={includeSourceUrl}
          includeDateTime={includeDateTime}
          onBack={onCloseSettings!}
          onThemeChange={onThemeChange}
          onSettingToggle={onSettingToggle}
          onDismissTimerChange={onDismissTimerChange}
          onDisconnect={onDisconnect}
        />
      </div>
    )
  }

  return (
    <div className={`w-[320px] rounded-2xl border overflow-hidden ${isDark ? 'bg-[#1A1A1A] border-white/10' : 'bg-white border-black/10'}`}>
      {/* Header */}
      <div className={`px-4 py-3 flex items-center justify-between border-b ${isDark ? 'border-white/10' : 'border-black/10'}`}>
        <div className="flex items-center gap-2.5">
          <ClipFlowLogo size={28} />
          <div>
            <div className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-black'}`}>ClipFlow</div>
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
            className="w-full h-9 bg-indigo-500 hover:brightness-110 text-white text-sm rounded-lg transition-all"
          >
            Connect to Notion
          </button>
        </div>
      ) : (
        <>
          {/* Widget Toggle */}
          <div className={`mx-4 mt-4 p-3 rounded-xl flex items-center justify-between ${isDark ? 'bg-[#2A2A2A]/80' : 'bg-gray-50'}`}>
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
              className={`relative w-11 h-6 rounded-full transition-colors ${enabled ? 'bg-indigo-500' : isDark ? 'bg-gray-700' : 'bg-gray-300'}`}
            >
              <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow-sm ${enabled ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
            </button>
          </div>

          {/* Usage Stats (Free tier only) */}
          {!isPro && (
            <div className="mx-4 mt-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] text-gray-500">{savesToday} of {dailyLimit} saves today</span>
                <span className={`text-[10px] ${savesRemaining <= 2 ? 'text-amber-400' : 'text-gray-500'}`}>{savesRemaining} remaining</span>
              </div>
              <div className={`h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-[#2A2A2A]' : 'bg-gray-200'}`}>
                <div
                  className={`h-full rounded-full transition-all ${savePercentage >= 90 ? 'bg-red-500' : savePercentage >= 70 ? 'bg-amber-500' : 'bg-indigo-500'}`}
                  style={{ width: `${Math.min(savePercentage, 100)}%` }}
                />
              </div>
            </div>
          )}

          {/* Recent Saves */}
          <div className="mt-4">
            <div className="flex items-center justify-between px-4 mb-2">
              <span className="text-[10px] uppercase tracking-wider text-gray-500">Recent Saves</span>
              <Clock className="w-3 h-3 text-gray-600" />
            </div>
            {recentSaves.length === 0 ? (
              <div className="mx-4 py-4 text-center text-xs text-gray-600">No saves yet — copy some text to get started</div>
            ) : (
            <div className={`mx-2 rounded-xl overflow-hidden ${isDark ? 'bg-[#2A2A2A]/50' : 'bg-gray-50'}`}>
              {recentSaves.map((save, index) => (
                <button
                  key={save.id}
                  onClick={() => setExpandedId(expandedId === save.id ? null : save.id)}
                  className={`w-full px-3 py-2.5 flex items-start gap-2.5 text-left transition-colors ${isDark ? 'hover:bg-white/5' : 'hover:bg-gray-100'} ${index < recentSaves.length - 1 ? isDark ? 'border-b border-white/5' : 'border-b border-black/5' : ''}`}
                >
                  <div className="mt-0.5 shrink-0">
                    <PageIcon emoji={save.destinationEmoji} iconUrl={save.destinationIconUrl} size={16} />
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
              ))}
            </div>
            )}
          </div>

          {/* Upgrade CTA (Free tier only) */}
          {!isPro && (
            <div className="mx-4 mt-3">
              <button
                onClick={onUpgrade}
                className={`w-full px-3 py-2.5 rounded-xl flex items-center justify-between transition-colors ${isDark ? 'bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20' : 'bg-indigo-50 hover:bg-indigo-100 border border-indigo-200'}`}
              >
                <div className="flex items-center gap-2">
                  <Zap className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="text-xs text-indigo-400">Upgrade to Pro — unlimited saves</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-indigo-400" />
              </button>
            </div>
          )}

          {/* Footer */}
          <div className={`mt-4 px-4 py-2.5 flex items-center justify-between border-t ${isDark ? 'border-white/5' : 'border-black/5'}`}>
            <span className="text-[10px] text-gray-600">v1.0.0</span>
            <button className="flex items-center gap-1 text-[10px] text-gray-500 hover:text-gray-400 transition-colors">
              <span>Help & Feedback</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// ─── Inline Settings View ─────────────────────────────────────────────────────

interface SettingsViewProps {
  theme?: 'dark' | 'light'
  workspaceName?: string | null
  autoDismiss?: boolean
  dismissTimer?: number
  includeSourceUrl?: boolean
  includeDateTime?: boolean
  onBack: () => void
  onThemeChange?: (theme: 'dark' | 'light') => void
  onSettingToggle?: (key: 'autoDismiss' | 'includeSourceUrl' | 'includeDateTime', value: boolean) => void
  onDismissTimerChange?: (value: number) => void
  onDisconnect?: () => void
}

function Toggle({ on, onToggle, isDark }: { on: boolean; onToggle: () => void; isDark: boolean }) {
  return (
    <button
      onClick={onToggle}
      className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${on ? 'bg-indigo-500' : isDark ? 'bg-gray-600' : 'bg-gray-300'}`}
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
  workspaceName,
  autoDismiss = false,
  dismissTimer = 5,
  includeSourceUrl = false,
  includeDateTime = false,
  onBack,
  onThemeChange,
  onSettingToggle,
  onDismissTimerChange,
  onDisconnect,
}: SettingsViewProps) {
  const isDark = theme !== 'light'
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
                className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${isDark ? 'bg-indigo-500' : 'bg-gray-300'}`}
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
                  type="range" min="3" max="30" value={dismissTimer}
                  onChange={(e) => onDismissTimerChange?.(Number(e.target.value))}
                  className={`w-full h-2 rounded-lg appearance-none cursor-pointer
                    [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4
                    [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full
                    [&::-webkit-slider-thumb]:bg-indigo-500
                    ${isDark ? 'bg-[#2A2A2A]' : 'bg-gray-200'}`}
                />
              </div>
            )}
          </section>

          <div className={`border-t ${isDark ? 'border-white/10' : 'border-black/10'}`} />

          {/* Connected Workspace */}
          <section>
            <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-3">Connected Workspace</div>
            <div className={`rounded-lg p-3 ${isDark ? 'bg-[#2A2A2A]' : 'bg-gray-100'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <div className={`text-sm font-medium ${isDark ? 'text-white' : 'text-black'}`}>{workspaceName || 'My Workspace'}</div>
                  <div className="text-gray-500 text-xs">Connected</div>
                </div>
                <button
                  onClick={onDisconnect}
                  className="px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10 rounded transition-colors"
                >
                  Disconnect
                </button>
              </div>
            </div>
          </section>

        </div>
      </div>
    </>
  )
}
