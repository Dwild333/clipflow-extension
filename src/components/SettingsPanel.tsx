import { useState } from 'react'
import { ChevronDown, Star, Sun, Moon } from 'lucide-react'
import { NotionWorkspaceIcon } from '../shared/NotionWorkspaceIcon'

interface SettingsPanelProps {
  onBack: () => void
  theme?: 'dark' | 'light'
  onThemeChange?: (theme: 'dark' | 'light') => void
  autoDismiss?: boolean
  dismissTimer?: number
  onAutoDismissChange?: (enabled: boolean) => void
  onDismissTimerChange?: (seconds: number) => void
}

const destinations = [
  { id: '1', emoji: '📝', name: 'Code Snippets' },
  { id: '2', emoji: '💡', name: 'Ideas & Notes' },
  { id: '3', emoji: '📚', name: 'Reading List' },
]

const allNotionPages = [
  { id: '1', emoji: '📝', name: 'Code Snippets', isFavorite: true },
  { id: '2', emoji: '💡', name: 'Ideas & Notes', isFavorite: true },
  { id: '3', emoji: '📚', name: 'Reading List', isFavorite: true },
  { id: '4', emoji: '🎯', name: 'Goals 2026', isFavorite: false },
  { id: '5', emoji: '📊', name: 'Project Dashboard', isFavorite: false },
  { id: '6', emoji: '✅', name: 'Tasks', isFavorite: false },
  { id: '7', emoji: '📅', name: 'Meeting Notes', isFavorite: false },
  { id: '8', emoji: '🧠', name: 'Knowledge Base', isFavorite: false },
]

export function SettingsPanel({ onBack, theme = 'dark', onThemeChange, autoDismiss = false, dismissTimer = 5, onAutoDismissChange, onDismissTimerChange }: SettingsPanelProps) {
  const [defaultDestination, setDefaultDestination] = useState(destinations[0])
  const [showDestinationPicker, setShowDestinationPicker] = useState(false)
  const [favoritePages, setFavoritePages] = useState(allNotionPages)
  const [showManageDestinations, setShowManageDestinations] = useState(false)

  const toggleFavorite = (pageId: string) => {
    setFavoritePages(prev => prev.map(page => page.id === pageId ? { ...page, isFavorite: !page.isFavorite } : page))
  }

  const isDark = theme !== 'light'

  return (
    <>
      <div className="p-4 space-y-6 max-h-[400px] overflow-y-auto">
        {/* Default Destination */}
        <div>
          <label className="block text-[11px] uppercase font-medium text-gray-600 mb-2 px-1">Default Destination</label>
          <div className="relative">
            <button
              onClick={() => setShowDestinationPicker(!showDestinationPicker)}
              className={`w-full h-10 px-3 flex items-center justify-between rounded-lg transition-colors ${isDark ? 'bg-[#2A2A2A] hover:bg-[#3A3A3A]' : 'bg-gray-100 hover:bg-gray-200'}`}
            >
              <div className="flex items-center gap-2">
                <span className="text-base">{defaultDestination.emoji}</span>
                <span className={`text-sm ${isDark ? 'text-white' : 'text-black'}`}>{defaultDestination.name}</span>
              </div>
              <ChevronDown className={`w-4 h-4 transition-transform ${isDark ? 'text-gray-400' : 'text-gray-600'} ${showDestinationPicker ? 'rotate-180' : ''}`} />
            </button>
            {showDestinationPicker && (
              <div className={`absolute top-full mt-1 left-0 right-0 border rounded-lg overflow-hidden z-10 ${isDark ? 'bg-[#2A2A2A] border-white/10' : 'bg-white border-black/10'}`}>
                {destinations.map((dest) => (
                  <button
                    key={dest.id}
                    onClick={() => { setDefaultDestination(dest); setShowDestinationPicker(false) }}
                    className={`w-full h-9 px-3 flex items-center gap-2 transition-colors ${isDark ? 'hover:bg-[#3A3A3A]' : 'hover:bg-gray-100'}`}
                  >
                    <span className="text-base">{dest.emoji}</span>
                    <span className={`text-sm ${isDark ? 'text-white' : 'text-black'}`}>{dest.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick Save Destinations */}
        <div>
          <div className="flex items-center justify-between mb-2 px-1">
            <label className="text-[11px] uppercase font-medium text-gray-600">Quick Save Destinations</label>
            <button onClick={() => setShowManageDestinations(!showManageDestinations)} className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
              {showManageDestinations ? 'Done' : 'Manage'}
            </button>
          </div>
          {!showManageDestinations ? (
            <div className={`rounded-lg p-3 ${isDark ? 'bg-[#2A2A2A]/50' : 'bg-gray-100'}`}>
              <p className="text-xs text-gray-500">{favoritePages.filter(p => p.isFavorite).length} pages available in quick-save</p>
            </div>
          ) : (
            <div className={`rounded-lg overflow-hidden ${isDark ? 'bg-[#2A2A2A]/50' : 'bg-gray-100'}`}>
              <div className={`p-3 border-b ${isDark ? 'border-white/10' : 'border-black/10'}`}>
                <p className="text-xs text-gray-500">Select pages to show in quick-save picker</p>
              </div>
              <div className="max-h-[200px] overflow-y-auto">
                {favoritePages.map((page) => (
                  <button
                    key={page.id}
                    onClick={() => toggleFavorite(page.id)}
                    className={`w-full h-10 px-3 flex items-center justify-between transition-colors ${isDark ? 'hover:bg-[#3A3A3A]' : 'hover:bg-gray-200'}`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base">{page.emoji}</span>
                      <span className={`text-sm ${isDark ? 'text-white' : 'text-black'}`}>{page.name}</span>
                    </div>
                    <Star className={`w-4 h-4 transition-colors ${page.isFavorite ? 'fill-indigo-500 text-indigo-500' : 'text-gray-600'}`} />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Theme */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div>
              <label className={`block text-sm font-medium ${isDark ? 'text-white' : 'text-black'}`}>Theme</label>
              <p className="text-xs text-gray-500 mt-0.5">Choose your preferred theme</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{isDark ? 'Dark' : 'Light'}</span>
              <button
                onClick={() => onThemeChange && onThemeChange(theme === 'dark' ? 'light' : 'dark')}
                className={`relative w-11 h-6 rounded-full transition-colors ${isDark ? 'bg-indigo-500' : 'bg-gray-400'}`}
              >
                <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform flex items-center justify-center ${isDark ? 'translate-x-[22px]' : 'translate-x-0.5'}`}>
                  {isDark ? <Moon className="w-3 h-3 text-indigo-500" /> : <Sun className="w-3 h-3 text-gray-600" />}
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Auto-Dismiss */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div>
              <label className={`block text-sm font-medium ${isDark ? 'text-white' : 'text-black'}`}>Auto-Dismiss</label>
              <p className="text-xs text-gray-500 mt-0.5">Close popup after inactivity</p>
            </div>
            <button
              onClick={() => onAutoDismissChange && onAutoDismissChange(!autoDismiss)}
              className={`relative w-11 h-6 rounded-full transition-colors ${autoDismiss ? 'bg-indigo-500' : 'bg-gray-600'}`}
            >
              <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform ${autoDismiss ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
            </button>
          </div>
          {autoDismiss && (
            <div>
              <label className="block text-[11px] uppercase font-medium text-gray-600 mb-2 px-1">Dismiss Timer: {dismissTimer}s</label>
              <input
                type="range"
                min="3"
                max="15"
                value={dismissTimer}
                onChange={(e) => onDismissTimerChange && onDismissTimerChange(Number(e.target.value))}
                className={`w-full h-2 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-indigo-500 ${isDark ? 'bg-[#2A2A2A]' : 'bg-gray-200'}`}
              />
            </div>
          )}
        </div>

        {/* Connected Workspace */}
        <div>
          <label className="block text-[11px] uppercase font-medium text-gray-600 mb-2 px-1">Connected Workspace</label>
          <div className={`rounded-lg p-3 ${isDark ? 'bg-[#2A2A2A]' : 'bg-gray-100'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <NotionWorkspaceIcon size={32} />
                <div>
                  <div className={`text-sm font-medium ${isDark ? 'text-white' : 'text-black'}`}>My Workspace</div>
                  <div className="text-gray-500 text-xs">Connected</div>
                </div>
              </div>
              <button className="px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10 rounded transition-colors">Disconnect</button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
