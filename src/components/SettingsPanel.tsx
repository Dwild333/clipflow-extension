import { useState, useEffect } from 'react'
import { Sun, Moon, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react'
import type { NotionPage } from '../lib/notion'

interface SettingsPanelProps {
  onBack: () => void
  theme?: 'dark' | 'light'
  onThemeChange?: (theme: 'dark' | 'light') => void
  autoDismiss?: boolean
  dismissTimer?: number
  onAutoDismissChange?: (enabled: boolean) => void
  onDismissTimerChange?: (seconds: number) => void
  includeSourceUrl?: boolean
  includeDateTime?: boolean
  onIncludeSourceUrlChange?: (v: boolean) => void
  onIncludeDateTimeChange?: (v: boolean) => void
}

const HISTORY_PREVIEW = 10

interface SaveRecord {
  id: string
  textPreview: string
  destinationId: string
  destinationName: string
  destinationEmoji: string
  savedAt: string
  sourceUrl: string
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function Toggle({ on, onToggle, isDark }: { on: boolean; onToggle: () => void; isDark: boolean }) {
  return (
    <button
      onClick={onToggle}
      className={`relative w-11 h-6 rounded-full transition-colors ${on ? 'bg-indigo-500' : isDark ? 'bg-gray-600' : 'bg-gray-300'}`}
    >
      <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform ${on ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
    </button>
  )
}

export function SettingsPanel({
  onBack,
  theme = 'dark',
  onThemeChange,
  autoDismiss = false,
  dismissTimer = 5,
  onAutoDismissChange,
  onDismissTimerChange,
  includeSourceUrl = false,
  includeDateTime = false,
  onIncludeSourceUrlChange,
  onIncludeDateTimeChange,
}: SettingsPanelProps) {
  const [notionPages, setNotionPages] = useState<NotionPage[]>([])
  const [pagesLoading, setPagesLoading] = useState(false)
  const [showManagePages, setShowManagePages] = useState(false)
  const [history, setHistory] = useState<SaveRecord[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showAllHistory, setShowAllHistory] = useState(false)
  const isDark = theme !== 'light'

  // Load real Notion pages when manage section opens
  useEffect(() => {
    if (!showManagePages || notionPages.length > 0) return
    setPagesLoading(true)
    chrome.runtime.sendMessage({ type: 'SEARCH_PAGES', query: '' })
      .then((res: { success: boolean; pages?: NotionPage[] }) => {
        setNotionPages(res?.pages ?? [])
        setPagesLoading(false)
      })
      .catch(() => setPagesLoading(false))
  }, [showManagePages])

  // Load full save history from storage
  useEffect(() => {
    chrome.storage.local.get('recentSaves').then((result) => {
      const raw = result.recentSaves as SaveRecord[] | undefined
      setHistory(raw ?? [])
    })
  }, [])

  const row = (label: string, desc: string, control: React.ReactNode) => (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <div className={`text-sm font-medium ${isDark ? 'text-white' : 'text-black'}`}>{label}</div>
        <div className="text-xs text-gray-500 mt-0.5">{desc}</div>
      </div>
      <div className="shrink-0">{control}</div>
    </div>
  )

  return (
    <div className="overflow-y-auto max-h-[480px]">
      <div className="p-4 space-y-5">

        {/* ── Appearance ── */}
        <section>
          <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-3">Appearance</div>
          {row(
            'Theme',
            isDark ? 'Dark mode' : 'Light mode',
            <button
              onClick={() => onThemeChange?.(theme === 'dark' ? 'light' : 'dark')}
              className={`relative w-11 h-6 rounded-full transition-colors ${isDark ? 'bg-indigo-500' : 'bg-gray-300'}`}
            >
              <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform flex items-center justify-center ${isDark ? 'translate-x-[22px]' : 'translate-x-0.5'}`}>
                {isDark ? <Moon className="w-3 h-3 text-indigo-500" /> : <Sun className="w-3 h-3 text-gray-500" />}
              </div>
            </button>
          )}
        </section>

        <div className={`border-t ${isDark ? 'border-white/10' : 'border-black/10'}`} />

        {/* ── Save Options ── */}
        <section className="space-y-4">
          <div className="text-[10px] uppercase tracking-wider text-gray-500">Save Options</div>
          {row(
            'Include source URL',
            'Append the page URL below saved text',
            <Toggle on={includeSourceUrl} onToggle={() => onIncludeSourceUrlChange?.(!includeSourceUrl)} isDark={isDark} />
          )}
          {row(
            'Include date & time',
            'Append timestamp below saved text',
            <Toggle on={includeDateTime} onToggle={() => onIncludeDateTimeChange?.(!includeDateTime)} isDark={isDark} />
          )}
        </section>

        <div className={`border-t ${isDark ? 'border-white/10' : 'border-black/10'}`} />

        {/* ── Auto-Dismiss ── */}
        <section className="space-y-3">
          <div className="text-[10px] uppercase tracking-wider text-gray-500">Behaviour</div>
          {row(
            'Auto-dismiss',
            'Close widget after inactivity',
            <Toggle on={autoDismiss} onToggle={() => onAutoDismissChange?.(!autoDismiss)} isDark={isDark} />
          )}
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

        {/* ── Save History ── */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <div className="text-[10px] uppercase tracking-wider text-gray-500">
              Save History ({history.length})
            </div>
            {history.length > HISTORY_PREVIEW && (
              <button
                onClick={() => setShowAllHistory(v => !v)}
                className="text-[10px] text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                {showAllHistory ? 'Show less' : `View all ${history.length}`}
              </button>
            )}
          </div>
          {history.length === 0 ? (
            <div className="text-xs text-gray-500 py-2">No saves yet</div>
          ) : (
            <div className={`rounded-lg overflow-hidden border ${isDark ? 'border-white/10' : 'border-black/10'}`}>
              {(showAllHistory ? history : history.slice(0, HISTORY_PREVIEW)).map((item, i) => (
                <div key={item.id} className={i > 0 ? isDark ? 'border-t border-white/5' : 'border-t border-black/5' : ''}>
                  <button
                    onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                    className={`w-full px-3 py-2 flex items-start gap-2 text-left transition-colors ${isDark ? 'hover:bg-white/5' : 'hover:bg-gray-50'}`}
                  >
                    <span className="text-base mt-0.5 shrink-0 leading-none">
                      {item.destinationEmoji && item.destinationEmoji !== '📄' ? item.destinationEmoji : '📄'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className={`text-xs ${expandedId === item.id ? 'whitespace-pre-wrap break-words' : 'truncate'} ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        {item.textPreview}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <a
                          href={`https://notion.so/${item.destinationId?.replace(/-/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          onClick={e => e.stopPropagation()}
                          className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-0.5 transition-colors"
                        >
                          {item.destinationName}
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                        <span className="text-[10px] text-gray-600">·</span>
                        <span className="text-[10px] text-gray-600">{timeAgo(item.savedAt)}</span>
                        {item.sourceUrl && (
                          <>
                            <span className="text-[10px] text-gray-600">·</span>
                            <a
                              href={item.sourceUrl}
                              target="_blank"
                              rel="noreferrer"
                              onClick={e => e.stopPropagation()}
                              className="text-[10px] text-gray-500 hover:text-gray-400 flex items-center gap-0.5 transition-colors"
                            >
                              source <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          </>
                        )}
                      </div>
                    </div>
                    <span className="text-[10px] text-gray-600 shrink-0 mt-0.5">
                      {expandedId === item.id ? '▲' : '▼'}
                    </span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

      </div>
    </div>
  )
}
