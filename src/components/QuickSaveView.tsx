import { useState, useEffect, useRef, useCallback } from 'react'
import { Settings, X, ChevronDown, Check, CircleAlert, Zap } from 'lucide-react'
import { PageIcon } from './PageIcon'
import { motion, AnimatePresence } from 'motion/react'
import { DestinationPicker } from './DestinationPicker'
import { SettingsPanel } from './SettingsPanel'
import { CreateNewPage } from './CreateNewPage'
import { ClipperLogo } from './ClipperLogo'

interface QuickSaveViewProps {
  position: { x: number; y: number }
  onClose: () => void
  initialState?: 'default' | 'loading' | 'success' | 'error' | 'picker' | 'create' | 'settings'
  clipboardContent?: string
  sourceUrl?: string
  onPositionChange?: (position: { x: number; y: number }) => void
  onDragStateChange?: (dragging: boolean) => void
  theme?: 'dark' | 'light'
  onThemeChange?: (theme: 'dark' | 'light') => void
  autoDismiss?: boolean
  dismissTimer?: number
  onAutoDismissChange?: (enabled: boolean) => void
  onDismissTimerChange?: (seconds: number) => void
  includeSourceUrl?: boolean
  includeDateTime?: boolean
  includeStamp?: boolean
  includeDatabases?: boolean
  defaultDestinationMode?: 'fixed' | 'last-saved'
  onIncludeSourceUrlChange?: (v: boolean) => void
  onIncludeDateTimeChange?: (v: boolean) => void
  onIncludeStampChange?: (v: boolean) => void
  onIncludeDatabasesChange?: (v: boolean) => void
  onDefaultDestinationModeChange?: (mode: 'fixed' | 'last-saved') => void
  defaultDestination?: { id: string; emoji: string; iconUrl?: string; name: string; type?: 'page' | 'database' } | null
  isPro?: boolean
  preview?: boolean
}

type ViewState = 'quick-save' | 'destination-picker' | 'settings' | 'create-page'
type SaveState = 'idle' | 'loading' | 'success' | 'error'

function getDirection(from: ViewState, to: ViewState): number {
  const order: ViewState[] = ['quick-save', 'destination-picker', 'create-page', 'settings']
  return order.indexOf(to) >= order.indexOf(from) ? 1 : -1
}

export function QuickSaveView({
  position,
  onClose,
  initialState,
  clipboardContent,
  sourceUrl = '',
  onPositionChange,
  onDragStateChange,
  theme = 'dark',
  onThemeChange,
  autoDismiss,
  dismissTimer,
  onAutoDismissChange,
  onDismissTimerChange,
  includeSourceUrl = false,
  includeDateTime = false,
  includeStamp = false,
  includeDatabases = false,
  defaultDestinationMode = 'fixed',
  onIncludeSourceUrlChange,
  onIncludeDateTimeChange,
  onIncludeStampChange,
  onIncludeDatabasesChange,
  onDefaultDestinationModeChange,
  defaultDestination,
  isPro = false,
  preview,
}: QuickSaveViewProps) {
  const [currentView, setCurrentView] = useState<ViewState>(
    initialState === 'picker' ? 'destination-picker'
    : initialState === 'create' ? 'create-page'
    : initialState === 'settings' ? 'settings'
    : 'quick-save'
  )
  const [saveState, setSaveState] = useState<SaveState>(
    initialState === 'loading' ? 'loading'
    : initialState === 'success' ? 'success'
    : initialState === 'error' ? 'error'
    : 'idle'
  )
  const [saveError, setSaveError] = useState<string | null>(null)
  const [selectedDestination, setSelectedDestination] = useState<{ id: string; emoji: string; iconUrl?: string; name: string; type?: 'page' | 'database' }>(
    defaultDestination ?? { emoji: '📝', name: 'Choose a page', id: '', type: 'page' }
  )
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [lastInteraction, setLastInteraction] = useState(Date.now())
  const [direction, setDirection] = useState(1)
  const [userHasDragged, setUserHasDragged] = useState(false)
  const [userHasEngaged, setUserHasEngaged] = useState(false)
  const prevView = useRef(currentView)

  const handleInteraction = useCallback(() => {
    setLastInteraction(Date.now())
    setUserHasEngaged(true)
  }, [])

  const navigateTo = useCallback((view: ViewState) => {
    setDirection(getDirection(currentView, view))
    prevView.current = currentView
    setCurrentView(view)
    // Reset interaction timer when navigating to give user full duration
    setLastInteraction(Date.now())
  }, [currentView])

  useEffect(() => {
    // Only auto-dismiss if:
    // - Auto-dismiss is enabled
    // - User is on the main quick-save view
    // - Save is idle (not in progress or completed)
    // - User has NOT engaged with the widget (no clicks/interactions)
    if (!autoDismiss || !dismissTimer || currentView !== 'quick-save' || saveState !== 'idle' || userHasEngaged) return
    
    const timerId = setTimeout(() => onClose(), dismissTimer * 1000)
    return () => clearTimeout(timerId)
  }, [autoDismiss, dismissTimer, currentView, saveState, onClose, userHasEngaged])

  const WIDGET_WIDTH = 360
  const WIDGET_HEIGHT = 300 // conservative min height

  const handleMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement
    if (target.closest('button')) return
    handleInteraction()
    setIsDragging(true)
    setUserHasDragged(true)
    onDragStateChange?.(true)
    setDragOffset({ x: e.clientX - position.x, y: e.clientY - position.y })
  }

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return
      const rawX = e.clientX - dragOffset.x
      const rawY = e.clientY - dragOffset.y
      const clampedX = Math.max(0, Math.min(rawX, window.innerWidth - WIDGET_WIDTH))
      const clampedY = Math.max(0, Math.min(rawY, window.innerHeight - WIDGET_HEIGHT))
      onPositionChange?.({ x: clampedX, y: clampedY })
    }
    const handleMouseUp = () => {
      setIsDragging(false)
      // Keep drag flag set briefly so the mouseup-triggered click doesn't dismiss
      setTimeout(() => onDragStateChange?.(false), 200)
    }
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, dragOffset, onPositionChange, onDragStateChange])

  const handleSave = async () => {
    if (!selectedDestination.id) {
      navigateTo('destination-picker')
      return
    }
    setSaveState('loading')
    setSaveError(null)
    try {
      const result = await chrome.runtime.sendMessage({
        type: 'SAVE_TO_NOTION',
        text: clipboardContent || '',
        destinationId: selectedDestination.id,
        destinationName: selectedDestination.name,
        destinationEmoji: selectedDestination.emoji,
        destinationIconUrl: selectedDestination.iconUrl,
        destinationType: selectedDestination.type || 'page',
        sourceUrl,
      }) as { type: 'SAVE_RESULT'; success: boolean; error?: string }

      if (result?.success) {
        setSaveState('success')
        setTimeout(() => onClose(), 2000)
      } else {
        setSaveError(result?.error ?? null)
        setSaveState('error')
      }
    } catch {
      setSaveState('error')
    }
  }

  const handleDestinationSelect = useCallback((destination: { id: string; emoji: string; iconUrl?: string; name: string; type?: 'page' | 'database' }) => {
    setLastInteraction(Date.now()) // Reset auto-dismiss timer on destination selection
    setSelectedDestination(destination)
    setDirection(getDirection(currentView, 'quick-save'))
    prevView.current = currentView
    setCurrentView('quick-save')
    setLastInteraction(Date.now())
  }, [currentView])

  const slideVariants = {
    enter: (dir: number) => ({ x: dir > 0 ? 80 : -80, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? -80 : 80, opacity: 0 }),
  }

  const isDark = theme !== 'light'

  const renderContent = () => {
    const viewContent: Record<ViewState, React.ReactNode> = {
      'destination-picker': (
        <DestinationPicker
          key="destination-picker-stable"
          onBack={() => navigateTo('quick-save')}
          onSelect={handleDestinationSelect}
          onCreateNew={() => navigateTo('create-page')}
          theme={theme}
        />
      ),
      'settings': (
        <SettingsPanel
          onBack={() => navigateTo('quick-save')}
          theme={theme}
          onThemeChange={onThemeChange}
          autoDismiss={autoDismiss}
          dismissTimer={dismissTimer}
          onAutoDismissChange={onAutoDismissChange}
          onDismissTimerChange={onDismissTimerChange}
          includeSourceUrl={includeSourceUrl}
          includeDateTime={includeDateTime}
          includeStamp={includeStamp}
          includeDatabases={includeDatabases}
          onIncludeSourceUrlChange={onIncludeSourceUrlChange}
          onIncludeDateTimeChange={onIncludeDateTimeChange}
          onIncludeStampChange={onIncludeStampChange}
          onIncludeDatabasesChange={onIncludeDatabasesChange}
          isPro={isPro}
          defaultDestinationMode={defaultDestinationMode}
          onDefaultDestinationModeChange={onDefaultDestinationModeChange}
        />
      ),
      'create-page': (
        <CreateNewPage
          onBack={() => navigateTo('destination-picker')}
          onCreate={(page) => {
            setSelectedDestination(page)
            navigateTo('quick-save')
          }}
          theme={theme}
        />
      ),
      'quick-save': (
        <>
          {/* Clipboard Preview */}
          <div className="p-4">
            <div className={`rounded-lg p-3 max-h-[120px] overflow-y-auto ${
              isDark ? 'bg-white/[0.04] border border-white/[0.06]' : 'bg-black/[0.04] border border-black/[0.06]'
            }`}>
              <pre className={`font-mono text-xs whitespace-pre-wrap ${isDark ? 'text-gray-400' : 'text-gray-700'}`}>
                {clipboardContent || 'No content'}
              </pre>
            </div>
          </div>

          {/* Destination */}
          <div className="px-4 pb-4">
            <button
              onClick={() => { handleInteraction(); navigateTo('destination-picker') }}
              className={`w-full h-10 px-3 flex items-center justify-between rounded-lg transition-colors border ${
                isDark
                  ? 'bg-white/[0.04] hover:bg-white/[0.07] border-white/[0.07]'
                  : 'bg-black/[0.03] hover:bg-black/[0.06] border-black/[0.06]'
              }`}
            >
              <div className="flex items-center gap-2">
                <PageIcon emoji={selectedDestination.emoji} iconUrl={selectedDestination.iconUrl} size={20} type={selectedDestination.type} />
                <span className={`text-sm ${isDark ? 'text-white' : 'text-black'}`}>{selectedDestination.name}</span>
              </div>
              <ChevronDown className={`w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`} />
            </button>
          </div>

          {/* Save Button — with radial brand glow behind */}
          <div className="px-4 pb-4 relative">
            {isDark && (
              <div
                className="absolute inset-0 pointer-events-none rounded-b-2xl"
                style={{ background: 'radial-gradient(600px circle at 50% 120%, rgba(110,80,255,0.09), transparent 70%)' }}
              />
            )}
            <AnimatePresence mode="wait">
              {saveState === 'success' ? (
                <motion.div
                  key="success"
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="h-10 bg-green-500 rounded-lg flex items-center justify-center gap-2 text-white font-semibold"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 15, delay: 0.1 }}
                  >
                    <Check className="w-5 h-5" />
                  </motion.div>
                  <span>Saved!</span>
                </motion.div>
              ) : saveState === 'error' ? (
                <motion.div key="error" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
                  {saveError?.toLowerCase().includes('limit') && !isPro ? (
                    <>
                      <div className={`px-3 py-2.5 rounded-lg border text-center ${isDark ? 'bg-amber-500/10 border-amber-500/30' : 'bg-amber-50 border-amber-200'}`}>
                        <div className="text-sm font-medium text-amber-400 mb-0.5">Monthly limit reached</div>
                        <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>You've used all 75 free saves this month.</div>
                      </div>
                      <a
                        href="https://www.notionflow.io/clipper/pricing"
                        target="_blank"
                        rel="noreferrer"
                        className="w-full h-10 bg-gradient-to-b from-violet-500 to-indigo-600 hover:brightness-110 active:scale-[0.98] shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] text-white font-semibold rounded-lg transition-all flex items-center justify-center gap-2"
                      >
                        <Zap className="w-4 h-4" />
                        Upgrade for unlimited saves
                      </a>
                    </>
                  ) : (
                    <>
                      <div className="h-10 bg-red-500/20 border border-red-500/50 rounded-lg flex items-center justify-center gap-2 text-red-400 text-sm">
                        <CircleAlert className="w-4 h-4" />
                        <span>Failed to save — try again</span>
                      </div>
                      <button
                        onClick={() => { handleInteraction(); handleSave() }}
                        className="w-full h-10 bg-gradient-to-b from-violet-500 to-indigo-600 hover:brightness-110 active:scale-[0.98] shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] text-white font-semibold rounded-lg transition-all"
                      >
                        Retry
                      </button>
                    </>
                  )}
                </motion.div>
              ) : (
                <motion.button
                  key="save"
                  onClick={() => { handleInteraction(); handleSave() }}
                  disabled={saveState === 'loading'}
                  className="w-full h-10 bg-gradient-to-b from-violet-500 to-indigo-600 hover:brightness-110 active:scale-[0.98] disabled:opacity-50 text-white font-semibold rounded-lg transition-all flex items-center justify-center relative overflow-hidden"
                  style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.22), 0 2px 12px rgba(110,80,255,0.35)' }}
                  whileTap={{ scale: 0.97 }}
                >
                  {saveState === 'loading' ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : 'Save'}
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </>
      ),
    }

    return (
      <div>
        {viewContent[currentView]}
      </div>
    )
  }

  return (
    <div
      className={preview ? 'relative' : 'fixed z-[2147483647] animate-in fade-in zoom-in-95 duration-150'}
      style={preview ? undefined : { left: `${position.x}px`, top: `${position.y}px` }}
    >
      <div
        className={`w-[360px] backdrop-blur-[20px] border rounded-2xl overflow-hidden ${
          isDark
            ? 'border-white/[0.08] shadow-[0_1px_2px_rgba(0,0,0,0.6),0_12px_40px_rgba(0,0,0,0.6),0_40px_80px_rgba(0,0,0,0.4)]'
            : 'border-black/[0.08] shadow-[0_1px_2px_rgba(0,0,0,0.15),0_12px_40px_rgba(0,0,0,0.15),0_40px_80px_rgba(0,0,0,0.1)]'
        }`}
        style={isDark ? {
          background: 'linear-gradient(180deg, rgba(28,28,32,0.97) 0%, rgba(14,14,18,0.97) 100%)',
          boxShadow: '0 1px 2px rgba(0,0,0,0.6), 0 12px 40px rgba(0,0,0,0.6), 0 40px 80px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)',
        } : {
          background: 'linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(245,245,250,0.98) 100%)',
          boxShadow: '0 1px 2px rgba(0,0,0,0.12), 0 12px 40px rgba(0,0,0,0.12), 0 40px 80px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.9)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Persistent drag handle — always visible across all views */}
        {!preview && (
          <div
            className={`flex items-center justify-between h-11 px-4 cursor-move select-none ${
              isDark
                ? 'border-b border-b-white/[0.05] shadow-[0_1px_0_rgba(0,0,0,0.4)]'
                : 'border-b border-b-black/[0.06] shadow-[0_1px_0_rgba(0,0,0,0.04)]'
            }`}
            onMouseDown={handleMouseDown}
          >
            <div className="flex items-center gap-2">
              <div className={`rounded-lg p-0.5 ${isDark ? 'shadow-[0_0_12px_rgba(124,92,252,0.25)]' : ''}`}>
                <ClipperLogo size={16} />
              </div>
              {currentView === 'quick-save' ? (
                <div className="flex items-baseline gap-1.5">
                  <span className={`font-bold text-sm tracking-tight ${isDark ? 'text-white' : 'text-black'}`}>Clipper</span>
                  <span className={`text-[10px] font-medium tracking-wide ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>by NotionFlow</span>
                </div>
              ) : (
                <span className={`font-semibold text-sm ${isDark ? 'text-white' : 'text-black'}`}>
                  {currentView === 'settings' ? 'Settings'
                    : currentView === 'destination-picker' ? 'Choose Destination'
                    : 'Create New Page'}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {currentView === 'quick-save' && (
                <button
                  onClick={() => navigateTo('settings')}
                  className={`w-8 h-8 flex items-center justify-center rounded-md transition-colors ${
                    isDark ? 'hover:bg-white/10' : 'hover:bg-black/5'
                  }`}
                >
                  <Settings className={`w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`} />
                </button>
              )}
              <button
                onClick={currentView === 'quick-save' ? onClose : () => navigateTo('quick-save')}
                className={`w-8 h-8 flex items-center justify-center rounded-md transition-colors ${
                  isDark ? 'hover:bg-white/10' : 'hover:bg-black/5'
                }`}
              >
                <X className={`w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`} />
              </button>
            </div>
          </div>
        )}
        {renderContent()}
      </div>
    </div>
  )
}
