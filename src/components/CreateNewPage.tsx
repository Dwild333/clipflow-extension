import { useState } from 'react'
import { ArrowLeft, ChevronDown } from 'lucide-react'

interface CreateNewPageProps {
  onBack: () => void
  onCreate: (page: { id: string; emoji: string; name: string }) => void
  theme?: 'dark' | 'light'
}

const parentLocations = [
  { id: '1', emoji: '🏠', name: 'Personal Wiki' },
  { id: '2', emoji: '💼', name: 'Work Notes' },
  { id: '3', emoji: '📚', name: 'Resources' },
]

export function CreateNewPage({ onBack, onCreate, theme = 'dark' }: CreateNewPageProps) {
  const [title, setTitle] = useState('')
  const [selectedParent, setSelectedParent] = useState(parentLocations[0])
  const [showParentPicker, setShowParentPicker] = useState(false)

  const handleCreate = () => {
    if (!title.trim()) return
    onCreate({ id: Date.now().toString(), emoji: '📄', name: title })
  }

  const isDark = theme !== 'light'

  return (
    <>
      <div className={`flex items-center justify-between h-11 px-4 border-b ${isDark ? 'border-white/10' : 'border-black/10'}`}>
        <button
          onClick={onBack}
          className={`flex items-center gap-2 text-sm font-semibold transition-colors ${isDark ? 'text-white hover:text-gray-300' : 'text-black hover:text-gray-700'}`}
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Create New Page</span>
        </button>
      </div>

      <div className="p-4 space-y-4">
        <div>
          <label className="block text-[11px] uppercase font-medium text-gray-600 mb-2 px-1">
            Page Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Untitled..."
            className={`w-full h-10 px-3 border focus:border-indigo-500/50 rounded-lg text-sm outline-none transition-colors ${
              isDark
                ? 'bg-[#2A2A2A] border-transparent text-white placeholder:text-gray-600'
                : 'bg-gray-100 border-transparent text-black placeholder:text-gray-500'
            }`}
            autoFocus
          />
        </div>

        <div>
          <label className="block text-[11px] uppercase font-medium text-gray-600 mb-2 px-1">
            Parent Page
          </label>
          <div className="relative">
            <button
              onClick={() => setShowParentPicker(!showParentPicker)}
              className={`w-full h-10 px-3 flex items-center justify-between rounded-lg transition-colors ${isDark ? 'bg-[#2A2A2A] hover:bg-[#3A3A3A]' : 'bg-gray-100 hover:bg-gray-200'}`}
            >
              <div className="flex items-center gap-2">
                <span className="text-base">{selectedParent.emoji}</span>
                <span className={`text-sm ${isDark ? 'text-white' : 'text-black'}`}>{selectedParent.name}</span>
              </div>
              <ChevronDown className={`w-4 h-4 transition-transform ${isDark ? 'text-gray-400' : 'text-gray-600'} ${showParentPicker ? 'rotate-180' : ''}`} />
            </button>

            {showParentPicker && (
              <div className={`absolute top-full mt-1 left-0 right-0 border rounded-lg overflow-hidden z-10 ${isDark ? 'bg-[#2A2A2A] border-white/10' : 'bg-white border-black/10'}`}>
                {parentLocations.map((location) => (
                  <button
                    key={location.id}
                    onClick={() => { setSelectedParent(location); setShowParentPicker(false) }}
                    className={`w-full h-9 px-3 flex items-center gap-2 transition-colors ${isDark ? 'hover:bg-[#3A3A3A]' : 'hover:bg-gray-100'}`}
                  >
                    <span className="text-base">{location.emoji}</span>
                    <span className={`text-sm ${isDark ? 'text-white' : 'text-black'}`}>{location.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
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
          disabled={!title.trim()}
          className="flex-1 h-10 bg-indigo-500 hover:brightness-110 active:scale-[0.98] disabled:opacity-50 text-white font-semibold rounded-lg transition-all"
        >
          Create & Save
        </button>
      </div>
    </>
  )
}
