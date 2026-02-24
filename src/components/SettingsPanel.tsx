import { useState, useEffect } from 'react'
import { Sun, Moon, ChevronDown, ChevronUp, ExternalLink, Search, Check } from 'lucide-react'
import { getSettings } from '../lib/storage'
import type { NotionPage } from '../lib/notion'
import { PageIcon } from './PageIcon'

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
  destinationIconUrl?: string
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
  const [parentPage, setParentPage] = useState<NotionPage | null>(null)
  const [showParentPicker, setShowParentPicker] = useState(false)
  const [parentSearch, setParentSearch] = useState('')
  const [parentPages, setParentPages] = useState<NotionPage[]>([])
  const [parentPagesLoading, setParentPagesLoading] = useState(false)
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

  // Load saved parent page setting
  useEffect(() => {
    getSettings().then(s => {
      if (s.newPageParentId) {
        setParentPage({ id: s.newPageParentId, emoji: s.newPageParentEmoji, name: s.newPageParentName })
      }
    })
  }, [])

  // Fetch pages for parent picker when it opens
  useEffect(() => {
    if (!showParentPicker || parentPages.length > 0) return
    setParentPagesLoading(true)
    chrome.runtime.sendMessage({ type: 'SEARCH_PAGES', query: '' })
      .then((res: { success: boolean; pages?: NotionPage[] }) => {
        setParentPages(res?.pages ?? [])
        setParentPagesLoading(false)
      })
      .catch(() => setParentPagesLoading(false))
  }, [showParentPicker])

  const handleParentSelect = async (page: NotionPage) => {
    setParentPage(page)
    setShowParentPicker(false)
    setParentSearch('')
    const settings = await getSettings()
    await chrome.storage.local.set({
      settings: { ...settings, newPageParentId: page.id, newPageParentEmoji: page.emoji, newPageParentName: page.name }
    })
  }

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

        {/* ── Default Parent Page ── */}
        <section className="space-y-2">
          <div className="text-[10px] uppercase tracking-wider text-gray-500">New Page Location</div>
          <div className="text-xs text-gray-500">Where new pages are created by default</div>
          <button
            onClick={() => setShowParentPicker(v => !v)}
            className={`w-full h-10 px-3 flex items-center justify-between rounded-lg transition-colors ${isDark ? 'bg-[#2A2A2A] hover:bg-[#3A3A3A]' : 'bg-gray-100 hover:bg-gray-200'}`}
          >
            <div className="flex items-center gap-2">
              <span className="text-base">{parentPage?.emoji ?? '📄'}</span>
              <span className={`text-sm truncate ${parentPage ? (isDark ? 'text-white' : 'text-black') : 'text-gray-500'}`}>
                {parentPage?.name ?? 'Not set — tap to choose'}
              </span>
            </div>
            <ChevronDown className={`w-4 h-4 shrink-0 transition-transform ${isDark ? 'text-gray-400' : 'text-gray-600'} ${showParentPicker ? 'rotate-180' : ''}`} />
          </button>

          {showParentPicker && (
            <div className={`border rounded-lg overflow-hidden ${isDark ? 'bg-[#2A2A2A] border-white/10' : 'bg-white border-black/10'}`}>
              <div className={`px-2 py-2 border-b ${isDark ? 'border-white/10' : 'border-black/10'}`}>
                <div className="relative">
                  <Search className={`absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                  <input
                    type="text"
                    value={parentSearch}
                    onChange={e => setParentSearch(e.target.value)}
                    placeholder="Search pages..."
                    className={`w-full h-8 pl-8 pr-3 rounded-md text-xs outline-none ${isDark ? 'bg-[#1A1A1A] text-white placeholder:text-gray-600' : 'bg-gray-100 text-black placeholder:text-gray-500'}`}
                  />
                </div>
              </div>
              <div className="max-h-[160px] overflow-y-auto">
                {parentPagesLoading ? (
                  <div className="flex justify-center py-4">
                    <div className={`w-4 h-4 border-2 rounded-full animate-spin ${isDark ? 'border-gray-600 border-t-white' : 'border-gray-300 border-t-black'}`} />
                  </div>
                ) : (parentSearch ? parentPages.filter(p => p.name.toLowerCase().includes(parentSearch.toLowerCase())) : parentPages).length === 0 ? (
                  <div className="py-3 text-center text-xs text-gray-500">No pages found</div>
                ) : (parentSearch ? parentPages.filter(p => p.name.toLowerCase().includes(parentSearch.toLowerCase())) : parentPages).map(page => (
                  <button
                    key={page.id}
                    onClick={() => handleParentSelect(page)}
                    className={`w-full h-9 px-3 flex items-center gap-2 transition-colors ${
                      parentPage?.id === page.id
                        ? isDark ? 'bg-indigo-500/20' : 'bg-indigo-50'
                        : isDark ? 'hover:bg-[#3A3A3A]' : 'hover:bg-gray-100'
                    }`}
                  >
                    <span className="text-base shrink-0">{page.emoji}</span>
                    <span className={`text-sm truncate flex-1 text-left ${isDark ? 'text-white' : 'text-black'}`}>{page.name}</span>
                    {parentPage?.id === page.id && <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" />}
                  </button>
                ))}
              </div>
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
                    <div className="mt-0.5 shrink-0">
                      <PageIcon emoji={item.destinationEmoji || '📄'} iconUrl={item.destinationIconUrl} size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`text-xs ${expandedId === item.id ? 'whitespace-pre-wrap break-words' : 'truncate'} ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        {item.textPreview}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <a
                          href={`https://notion.so/${item.destinationId?.replace(/-/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          onClick={e => e.stopPropagation()}
                          className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-0.5 transition-colors shrink-0"
                        >
                          {item.destinationName}
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                        {item.sourceUrl && (
                          <>
                            <span className="text-[10px] text-gray-600">·</span>
                            <a
                              href={item.sourceUrl}
                              target="_blank"
                              rel="noreferrer"
                              onClick={e => e.stopPropagation()}
                              className="text-[10px] text-gray-500 hover:text-gray-400 flex items-center gap-0.5 transition-colors shrink-0"
                            >
                              source <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          </>
                        )}
                        <span className="text-[10px] text-gray-400 ml-auto shrink-0">{timeAgo(item.savedAt)}</span>
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
