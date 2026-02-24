import { useState, useEffect, useRef } from 'react'
import { Settings, X, ChevronDown, Check, CircleAlert, Zap } from 'lucide-react'
import { PageIcon } from './PageIcon'
import { motion, AnimatePresence } from 'motion/react'
import { DestinationPicker } from './DestinationPicker'
import { SettingsPanel } from './SettingsPanel'
import { CreateNewPage } from './CreateNewPage'
import { ClipFlowLogo } from './ClipFlowLogo'

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
  onIncludeSourceUrlChange?: (v: boolean) => void
  onIncludeDateTimeChange?: (v: boolean) => void
  defaultDestination?: { id: string; emoji: string; iconUrl?: string; name: string } | null
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
  onIncludeSourceUrlChange,
  onIncludeDateTimeChange,
  defaultDestination,
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
  const [selectedDestination, setSelectedDestination] = useState<{ id: string; emoji: string; iconUrl?: string; name: string }>(
    defaultDestination ?? { emoji: '📝', name: 'Choose a page', id: '' }
  )
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [lastInteraction, setLastInteraction] = useState(Date.now())
  const [direction, setDirection] = useState(1)
  const [userHasDragged, setUserHasDragged] = useState(false)
  const prevView = useRef(currentView)

  const navigateTo = (view: ViewState) => {
    setDirection(getDirection(currentView, view))
    prevView.current = currentView
    setCurrentView(view)
  }

  useEffect(() => {
    if (!autoDismiss || !dismissTimer || currentView !== 'quick-save' || saveState !== 'idle' || userHasDragged) return
    const timerId = setTimeout(() => onClose(), dismissTimer * 1000)
    return () => clearTimeout(timerId)
  }, [autoDismiss, dismissTimer, currentView, saveState, onClose, lastInteraction, userHasDragged])

  const handleInteraction = () => setLastInteraction(Date.now())

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
        sourceUrl,
      }) as { type: 'SAVE_RESULT'; success: boolean; error?: string }

      if (result?.success) {
        setSaveState('success')
        if (autoDismiss && dismissTimer) {
          setTimeout(() => onClose(), dismissTimer * 1000)
        }
      } else {
        setSaveError(result?.error ?? null)
        setSaveState('error')
      }
    } catch {
      setSaveState('error')
    }
  }

  const handleDestinationSelect = (destination: { id: string; emoji: string; iconUrl?: string; name: string }) => {
    setSelectedDestination(destination)
    navigateTo('quick-save')
  }

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
          onIncludeSourceUrlChange={onIncludeSourceUrlChange}
          onIncludeDateTimeChange={onIncludeDateTimeChange}
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
            <div className={`rounded-lg p-3 max-h-[120px] overflow-y-auto ${isDark ? 'bg-[#2A2A2A]/90' : 'bg-gray-100'}`}>
              <pre className={`font-mono text-xs whitespace-pre-wrap ${isDark ? 'text-gray-400' : 'text-gray-700'}`}>
                {clipboardContent || 'No content'}
              </pre>
            </div>
          </div>

          {/* Destination */}
          <div className="px-4 pb-4">
            <button
              onClick={() => { handleInteraction(); navigateTo('destination-picker') }}
              className={`w-full h-10 px-3 flex items-center justify-between rounded-lg transition-colors ${isDark ? 'bg-[#2A2A2A]/50 hover:bg-[#3A3A3A]' : 'bg-gray-100 hover:bg-gray-200'}`}
            >
              <div className="flex items-center gap-2">
                <PageIcon emoji={selectedDestination.emoji} iconUrl={selectedDestination.iconUrl} size={20} />
                <span className={`text-sm ${isDark ? 'text-white' : 'text-black'}`}>{selectedDestination.name}</span>
              </div>
              <ChevronDown className={`w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`} />
            </button>
          </div>

          {/* Save Button */}
          <div className="px-4 pb-4">
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
                  {saveError?.toLowerCase().includes('limit') ? (
                    <>
                      <div className={`px-3 py-2.5 rounded-lg border text-center ${isDark ? 'bg-amber-500/10 border-amber-500/30' : 'bg-amber-50 border-amber-200'}`}>
                        <div className="text-sm font-medium text-amber-400 mb-0.5">Daily limit reached</div>
                        <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>You've used all 10 free saves today. Resets at midnight.</div>
                      </div>
                      <a
                        href="https://clipflow.tools/upgrade"
                        target="_blank"
                        rel="noreferrer"
                        className="w-full h-10 bg-indigo-500 hover:brightness-110 active:scale-[0.98] text-white font-semibold rounded-lg transition-all flex items-center justify-center gap-2"
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
                        className="w-full h-10 bg-indigo-500 hover:brightness-110 active:scale-[0.98] text-white font-semibold rounded-lg transition-all"
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
                  className="w-full h-10 bg-indigo-500 hover:brightness-110 active:scale-[0.98] disabled:opacity-50 text-white font-semibold rounded-lg transition-all flex items-center justify-center"
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
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={currentView}
          custom={direction}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          {viewContent[currentView]}
        </motion.div>
      </AnimatePresence>
    )
  }

  return (
    <div
      className={preview ? 'relative' : 'fixed z-[2147483647] animate-in fade-in zoom-in-95 duration-150'}
      style={preview ? undefined : { left: `${position.x}px`, top: `${position.y}px` }}
    >
      <div
        className={`w-[360px] backdrop-blur-[20px] border rounded-2xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] overflow-hidden ${
          isDark ? 'bg-[#1A1A1A]/85 border-white/10' : 'bg-white/90 border-black/10'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Persistent drag handle — always visible across all views */}
        {!preview && (
          <div
            className={`flex items-center justify-between h-11 px-4 border-b cursor-move select-none ${
              isDark ? 'border-white/10' : 'border-black/10'
            }`}
            onMouseDown={handleMouseDown}
          >
            <div className="flex items-center gap-2">
              <ClipFlowLogo size={16} />
              <span className={`font-semibold text-sm ${isDark ? 'text-white' : 'text-black'}`}>
                {currentView === 'quick-save' ? 'ClipFlow'
                  : currentView === 'settings' ? 'Settings'
                  : currentView === 'destination-picker' ? 'Choose Destination'
                  : 'Create New Page'}
              </span>
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
