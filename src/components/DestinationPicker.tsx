import { useState, useEffect, useRef } from 'react'
import { ArrowLeft, Search, X, Plus } from 'lucide-react'
import type { NotionPage } from '../lib/notion'

async function searchPagesViaBackground(query: string): Promise<NotionPage[]> {
  const result = await chrome.runtime.sendMessage({ type: 'SEARCH_PAGES', query }) as { success: boolean; pages?: NotionPage[]; error?: string }
  if (!result?.success) throw new Error(result?.error || 'Search failed')
  return result.pages ?? []
}

interface DestinationPickerProps {
  onBack: () => void
  onSelect: (destination: { id: string; emoji: string; name: string }) => void
  onCreateNew: () => void
  theme?: 'dark' | 'light'
}

export function DestinationPicker({ onBack, onSelect, onCreateNew, theme = 'dark' }: DestinationPickerProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [recentPages, setRecentPages] = useState<NotionPage[]>([])
  const [searchResults, setSearchResults] = useState<NotionPage[]>([])
  const [loadError, setLoadError] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load recent pages on mount
  useEffect(() => {
    setIsSearching(true)
    searchPagesViaBackground('')
      .then(pages => { setRecentPages(pages); setIsSearching(false) })
      .catch(() => { setLoadError(true); setIsSearching(false) })
  }, [])

  const handleSearch = (value: string) => {
    setSearchQuery(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!value.trim()) { setSearchResults([]); return }
    setIsSearching(true)
    debounceRef.current = setTimeout(() => {
      searchPagesViaBackground(value)
        .then(pages => { setSearchResults(pages); setIsSearching(false) })
        .catch(() => setIsSearching(false))
    }, 300)
  }

  const displayPages = searchQuery ? searchResults : recentPages
  const isDark = theme !== 'light'

  return (
    <>
      <div className={`flex items-center justify-between h-11 px-4 border-b ${isDark ? 'border-white/10' : 'border-black/10'}`}>
        <button
          onClick={onBack}
          className={`flex items-center gap-2 text-sm font-semibold transition-colors ${isDark ? 'text-white hover:text-gray-300' : 'text-black hover:text-gray-700'}`}
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Choose Destination</span>
        </button>
      </div>

      <div className="p-4">
        <div className="relative">
          <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search pages..."
            className={`w-full h-10 pl-10 pr-10 border focus:border-indigo-500/50 rounded-lg text-sm outline-none transition-colors ${
              isDark
                ? 'bg-[#2A2A2A] border-transparent text-white placeholder:text-gray-600'
                : 'bg-gray-100 border-transparent text-black placeholder:text-gray-500'
            }`}
            autoFocus
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className={`absolute right-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="max-h-[240px] overflow-y-auto px-4">
        {isSearching ? (
          <div className="flex items-center justify-center py-8">
            <div className={`w-6 h-6 border-2 rounded-full animate-spin ${isDark ? 'border-gray-600 border-t-white' : 'border-gray-300 border-t-black'}`} />
          </div>
        ) : loadError ? (
          <div className={`text-center py-8 text-sm ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>
            Failed to load pages
          </div>
        ) : displayPages.length > 0 ? (
          <div className="pb-4">
            {!searchQuery && <div className="text-[11px] uppercase font-medium text-gray-600 mb-2 px-3 pt-2">Recent</div>}
            <div className="space-y-1">
              {displayPages.map((page) => (
                <button
                  key={page.id}
                  onClick={() => onSelect(page)}
                  className={`w-full h-9 px-3 flex items-center gap-2 rounded-md transition-colors ${isDark ? 'hover:bg-[#3A3A3A]' : 'hover:bg-gray-200'}`}
                >
                  <span className="text-base">{page.emoji}</span>
                  <span className={`text-sm ${isDark ? 'text-white' : 'text-black'}`}>
                    {searchQuery
                      ? page.name.split(new RegExp(`(${searchQuery})`, 'gi')).map((part: string, i: number) =>
                          part.toLowerCase() === searchQuery.toLowerCase()
                            ? <mark key={i} className={isDark ? 'bg-indigo-500/30 text-white' : 'bg-indigo-200 text-black'}>{part}</mark>
                            : part
                        )
                      : page.name
                    }
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className={`text-center py-8 text-sm ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>
            {searchQuery ? 'No pages found' : 'No pages available'}
          </div>
        )}
      </div>

      <div className={`border-t ${isDark ? 'border-white/10' : 'border-black/10'}`}>
        <button
          onClick={onCreateNew}
          className={`w-full h-11 px-4 flex items-center gap-2 transition-colors ${isDark ? 'hover:bg-[#3A3A3A]' : 'hover:bg-gray-100'}`}
        >
          <Plus className={`w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`} />
          <span className={`text-sm ${isDark ? 'text-white' : 'text-black'}`}>Create new page</span>
        </button>
      </div>
    </>
  )
}
