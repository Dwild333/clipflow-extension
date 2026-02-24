import { useState, useEffect } from 'react'
import { ChevronDown, Search, Check } from 'lucide-react'
import { getSettings } from '../lib/storage'
import type { NotionPage } from '../lib/notion'
import { PageIcon } from './PageIcon'

interface CreateNewPageProps {
  onBack: () => void
  onCreate: (page: { id: string; emoji: string; name: string }) => void
  theme?: 'dark' | 'light'
}

export function CreateNewPage({ onBack, onCreate, theme = 'dark' }: CreateNewPageProps) {
  const [title, setTitle] = useState('')
  const [selectedParent, setSelectedParent] = useState<NotionPage | null>(null)
  const [showParentPicker, setShowParentPicker] = useState(false)
  const [pages, setPages] = useState<NotionPage[]>([])
  const [pagesLoading, setPagesLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const isDark = theme !== 'light'

  // Load default parent from settings and fetch pages
  useEffect(() => {
    getSettings().then(s => {
      if (s.newPageParentId) {
        setSelectedParent({ id: s.newPageParentId, emoji: s.newPageParentEmoji, name: s.newPageParentName })
      }
    })
    setPagesLoading(true)
    chrome.runtime.sendMessage({ type: 'SEARCH_PAGES', query: '' })
      .then((res: { success: boolean; pages?: NotionPage[] }) => {
        setPages(res?.pages ?? [])
        setPagesLoading(false)
      })
      .catch(() => setPagesLoading(false))
  }, [])

  const filteredPages = searchQuery
    ? pages.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : pages

  const handleCreate = async () => {
    if (!title.trim() || !selectedParent) return
    setCreating(true)
    setError(null)
    try {
      const result = await chrome.runtime.sendMessage({
        type: 'CREATE_PAGE',
        parentPageId: selectedParent.id,
        title: title.trim(),
      }) as { success: boolean; page?: NotionPage; error?: string }

      if (result?.success && result.page) {
        // Persist this parent as the new default
        const settings = await getSettings()
        await chrome.storage.local.set({
          settings: {
            ...settings,
            newPageParentId: selectedParent.id,
            newPageParentEmoji: selectedParent.emoji,
            newPageParentName: selectedParent.name,
          }
        })
        onCreate(result.page)
      } else {
        setError(result?.error ?? 'Failed to create page')
      }
    } catch {
      setError('Failed to create page')
    } finally {
      setCreating(false)
    }
  }

  return (
    <>
      <div className="p-4 space-y-4">
        {/* Title */}
        <div>
          <label className="block text-[11px] uppercase font-medium text-gray-600 mb-2 px-1">
            Page Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleCreate() }}
            placeholder="Untitled..."
            className={`w-full h-10 px-3 border focus:border-indigo-500/50 rounded-lg text-sm outline-none transition-colors ${
              isDark
                ? 'bg-[#2A2A2A] border-transparent text-white placeholder:text-gray-600'
                : 'bg-gray-100 border-transparent text-black placeholder:text-gray-500'
            }`}
            autoFocus
          />
        </div>

        {/* Parent Page */}
        <div>
          <label className="block text-[11px] uppercase font-medium text-gray-600 mb-2 px-1">
            Parent Page
          </label>
          <button
            onClick={() => setShowParentPicker(v => !v)}
            className={`w-full h-10 px-3 flex items-center justify-between rounded-lg transition-colors ${isDark ? 'bg-[#2A2A2A] hover:bg-[#3A3A3A]' : 'bg-gray-100 hover:bg-gray-200'}`}
          >
            <div className="flex items-center gap-2">
              <PageIcon emoji={selectedParent?.emoji ?? '📄'} iconUrl={selectedParent?.iconUrl} size={18} />
              <span className={`text-sm ${selectedParent ? (isDark ? 'text-white' : 'text-black') : 'text-gray-500'}`}>
                {selectedParent?.name ?? 'Choose a parent page'}
              </span>
            </div>
            <ChevronDown className={`w-4 h-4 transition-transform ${isDark ? 'text-gray-400' : 'text-gray-600'} ${showParentPicker ? 'rotate-180' : ''}`} />
          </button>

          {showParentPicker && (
            <div className={`mt-1 border rounded-lg overflow-hidden ${isDark ? 'bg-[#2A2A2A] border-white/10' : 'bg-white border-black/10'}`}>
              {/* Search */}
              <div className={`px-2 py-2 border-b ${isDark ? 'border-white/10' : 'border-black/10'}`}>
                <div className="relative">
                  <Search className={`absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search pages..."
                    className={`w-full h-8 pl-8 pr-3 rounded-md text-xs outline-none ${isDark ? 'bg-[#1A1A1A] text-white placeholder:text-gray-600' : 'bg-gray-100 text-black placeholder:text-gray-500'}`}
                    autoFocus
                  />
                </div>
              </div>
              {/* Page list */}
              <div className="max-h-[140px] overflow-y-auto">
                {pagesLoading ? (
                  <div className="flex justify-center py-4">
                    <div className={`w-4 h-4 border-2 rounded-full animate-spin ${isDark ? 'border-gray-600 border-t-white' : 'border-gray-300 border-t-black'}`} />
                  </div>
                ) : filteredPages.length === 0 ? (
                  <div className="py-3 text-center text-xs text-gray-500">No pages found</div>
                ) : filteredPages.map(page => (
                  <button
                    key={page.id}
                    onClick={() => { setSelectedParent(page); setShowParentPicker(false); setSearchQuery('') }}
                    className={`w-full h-9 px-3 flex items-center gap-2 transition-colors ${
                      selectedParent?.id === page.id
                        ? isDark ? 'bg-indigo-500/20' : 'bg-indigo-50'
                        : isDark ? 'hover:bg-[#3A3A3A]' : 'hover:bg-gray-100'
                    }`}
                  >
                    <PageIcon emoji={page.emoji} iconUrl={page.iconUrl} size={18} />
                    <span className={`text-sm truncate flex-1 text-left ${isDark ? 'text-white' : 'text-black'}`}>{page.name}</span>
                    {selectedParent?.id === page.id && <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>

      <div className="px-4 pb-4 flex gap-2">
        <button
          onClick={onBack}
          className={`flex-1 h-10 bg-transparent font-semibold rounded-lg transition-all ${isDark ? 'hover:bg-white/10 text-gray-400 hover:text-white' : 'hover:bg-black/5 text-gray-600 hover:text-black'}`}
        >
          Cancel
        </button>
        <button
          onClick={handleCreate}
          disabled={!title.trim() || !selectedParent || creating}
          className="flex-1 h-10 bg-indigo-500 hover:brightness-110 active:scale-[0.98] disabled:opacity-50 text-white font-semibold rounded-lg transition-all flex items-center justify-center"
        >
          {creating ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Create & Save'}
        </button>
      </div>
    </>
  )
}
