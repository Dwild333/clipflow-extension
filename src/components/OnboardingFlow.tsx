import { useState, useEffect } from 'react'
import { Check, Clipboard, Zap, ChevronRight, Search } from 'lucide-react'
import { ClipFlowLogo } from './ClipFlowLogo'
import { setStorage, getSettings } from '../lib/storage'
import type { NotionPage } from '../lib/notion'

interface OnboardingFlowProps {
  theme?: 'dark' | 'light'
  workspaceName?: string | null
  onComplete: () => void
}

const INTRO_STEPS = [
  {
    icon: Clipboard,
    title: 'Copy anything',
    description: 'Select text on any webpage and press Ctrl+C (or Cmd+C on Mac). The ClipFlow widget will appear.',
  },
  {
    icon: Zap,
    title: 'Save instantly',
    description: 'Hit Save and your text is appended to your Notion page — no tab switching needed.',
  },
]

export function OnboardingFlow({ theme = 'dark', workspaceName, onComplete }: OnboardingFlowProps) {
  // step 0,1 = intro slides; step 2 = page picker
  const [step, setStep] = useState(0)
  const [pages, setPages] = useState<NotionPage[]>([])
  const [pagesLoading, setPagesLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPage, setSelectedPage] = useState<NotionPage | null>(null)
  const isDark = theme !== 'light'
  const TOTAL_STEPS = INTRO_STEPS.length + 1 // +1 for page picker

  useEffect(() => {
    if (step === INTRO_STEPS.length) {
      setPagesLoading(true)
      chrome.runtime.sendMessage({ type: 'SEARCH_PAGES', query: '' })
        .then((res: { success: boolean; pages?: NotionPage[] }) => {
          setPages(res?.pages ?? [])
          setPagesLoading(false)
        })
        .catch(() => setPagesLoading(false))
    }
  }, [step])

  const filteredPages = searchQuery
    ? pages.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : pages

  const handleComplete = async () => {
    const settings = await getSettings()
    await setStorage('settings', {
      ...settings,
      widgetEnabled: true,
      defaultDestinationId: selectedPage?.id ?? null,
      defaultDestinationEmoji: selectedPage?.emoji ?? '📝',
      defaultDestinationName: selectedPage?.name ?? 'Choose a page',
    })
    await setStorage('onboardingComplete', true)
    onComplete()
  }

  const isPagePickerStep = step === INTRO_STEPS.length

  return (
    <div className={`w-[320px] rounded-2xl border overflow-hidden ${isDark ? 'bg-[#1A1A1A] border-white/10' : 'bg-white border-black/10'}`}>
      {/* Header */}
      <div className={`px-4 py-3 flex items-center gap-2.5 border-b ${isDark ? 'border-white/10' : 'border-black/10'}`}>
        <ClipFlowLogo size={28} />
        <div>
          <div className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-black'}`}>Welcome to ClipFlow</div>
          <div className="text-[10px] text-gray-500">Connected to {workspaceName || 'your workspace'}</div>
        </div>
      </div>

      {/* Step indicators */}
      <div className="flex items-center justify-center gap-2 pt-4 pb-1">
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
          <div
            key={i}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === step ? 'w-6 bg-indigo-500' : i < step ? 'w-3 bg-indigo-500/50' : 'w-3 bg-gray-700'
            }`}
          />
        ))}
      </div>

      {/* Intro steps */}
      {!isPagePickerStep && (() => {
        const StepIcon = INTRO_STEPS[step].icon
        return (
          <div className="px-6 py-5 text-center min-h-[160px] flex flex-col items-center justify-center">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 ${isDark ? 'bg-indigo-500/15' : 'bg-indigo-50'}`}>
              <StepIcon className="w-7 h-7 text-indigo-400" />
            </div>
            <div className={`text-base font-semibold mb-2 ${isDark ? 'text-white' : 'text-black'}`}>{INTRO_STEPS[step].title}</div>
            <div className="text-sm text-gray-500 leading-relaxed">{INTRO_STEPS[step].description}</div>
          </div>
        )
      })()}

      {/* Page picker step */}
      {isPagePickerStep && (
        <div className="px-4 pt-4 pb-2">
          <div className={`text-sm font-semibold mb-1 ${isDark ? 'text-white' : 'text-black'}`}>Set a default page</div>
          <div className="text-xs text-gray-500 mb-3">Pick where your clips go by default. You can change this anytime.</div>
          <div className="relative mb-2">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search pages..."
              className={`w-full h-9 pl-9 pr-3 rounded-lg text-sm outline-none ${
                isDark ? 'bg-[#2A2A2A] text-white placeholder:text-gray-600' : 'bg-gray-100 text-black placeholder:text-gray-500'
              }`}
            />
          </div>
          <div className="max-h-[180px] overflow-y-auto space-y-0.5">
            {pagesLoading ? (
              <div className="flex justify-center py-6">
                <div className={`w-5 h-5 border-2 rounded-full animate-spin ${isDark ? 'border-gray-600 border-t-white' : 'border-gray-300 border-t-black'}`} />
              </div>
            ) : filteredPages.length === 0 ? (
              <div className="text-center py-6 text-xs text-gray-500">No pages found</div>
            ) : filteredPages.map(page => (
              <button
                key={page.id}
                onClick={() => setSelectedPage(page)}
                className={`w-full h-9 px-3 flex items-center gap-2 rounded-lg transition-colors ${
                  selectedPage?.id === page.id
                    ? 'bg-indigo-500/20 border border-indigo-500/40'
                    : isDark ? 'hover:bg-[#2A2A2A]' : 'hover:bg-gray-100'
                }`}
              >
                <span className="text-base">{page.emoji}</span>
                <span className={`text-sm truncate ${isDark ? 'text-white' : 'text-black'}`}>{page.name}</span>
                {selectedPage?.id === page.id && <Check className="w-3.5 h-3.5 text-indigo-400 ml-auto shrink-0" />}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="px-4 py-4 flex items-center gap-3">
        {step > 0 && (
          <button
            onClick={() => setStep(s => s - 1)}
            className={`flex-1 h-9 rounded-lg text-sm transition-colors ${isDark ? 'bg-white/5 hover:bg-white/10 text-gray-400' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'}`}
          >
            Back
          </button>
        )}
        <button
          onClick={isPagePickerStep ? handleComplete : () => setStep(s => s + 1)}
          className="flex-1 h-9 bg-indigo-500 hover:brightness-110 active:scale-[0.98] text-white text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5"
        >
          {isPagePickerStep ? (
            <><Check className="w-4 h-4" /><span>Get started</span></>
          ) : (
            <><span>Next</span><ChevronRight className="w-4 h-4" /></>
          )}
        </button>
      </div>
    </div>
  )
}
