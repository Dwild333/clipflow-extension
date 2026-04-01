import { useState, useEffect, useCallback, useRef } from "react"
import type { PlasmoCSConfig, PlasmoGetShadowHostId, PlasmoGetStyle } from "plasmo"
import styleText from "data-text:./clip-widget.css"
import { QuickSaveView } from "../components/QuickSaveView"
import { getSettings } from "../lib/storage"
import type { ShowWidgetMessage } from "../lib/messages"

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"],
}

export const getShadowHostId: PlasmoGetShadowHostId = () => "clipflow-widget-host"

export const getStyle: PlasmoGetStyle = () => {
  const style = document.createElement("style")
  style.textContent = styleText
  return style
}

interface WidgetState {
  visible: boolean
  text: string
  sourceUrl: string
  position: { x: number; y: number }
  theme: "dark" | "light"
  autoDismiss: boolean
  dismissTimer: number
  includeSourceUrl: boolean
  includeDateTime: boolean
  includeStamp: boolean
  includeDatabases: boolean
  defaultDestinationMode: 'fixed' | 'last-saved'
  defaultDestination: { id: string; emoji: string; iconUrl?: string; name: string } | null
  isPro: boolean
}

export default function ClipWidget() {
  const [widget, setWidget] = useState<WidgetState>({
    visible: false,
    text: "",
    sourceUrl: "",
    position: { x: 100, y: 100 },
    theme: "dark",
    autoDismiss: false,
    dismissTimer: 5,
    includeSourceUrl: false,
    includeDateTime: false,
    includeStamp: false,
    includeDatabases: false,
    defaultDestinationMode: 'fixed' as const,
    defaultDestination: null,
    isPro: false,
  })

  const isDraggingRef = useRef(false)
  // Direct ref to the rendered widget element — used for reliable hit-testing
  // in handleClickOutside instead of composedPath/target retargeting, which can
  // fail on sites like Genspark that intercept or re-dispatch click events.
  const widgetElRef = useRef<HTMLDivElement | null>(null)

  // On some sites (e.g. Genspark) the <body> has a CSS transform applied for
  // scroll/animation effects. CSS transforms on ancestors break `position: fixed`,
  // causing the widget to appear squished or in the wrong position.
  // Fix: move the shadow host to <html> (which is never transformed) and
  // hard-reset any page CSS that might bleed onto the host element.
  useEffect(() => {
    const host = document.getElementById('clipflow-widget-host')
    if (!host) return

    // Move out of <body> so ancestor transforms can't capture fixed positioning
    if (host.parentElement !== document.documentElement) {
      document.documentElement.appendChild(host)
    }

    // Hard-reset host layout via setProperty('important') so page CSS can't override.
    // NOTE: do NOT set pointer-events:none — in shadow DOM that cascades into the
    // shadow root and makes the entire widget click-transparent.
    // The host has width:0/height:0 so it covers no page pixels and can't block clicks.
    const overrides: [string, string][] = [
      ['position', 'fixed'],
      ['left', '0'],
      ['top', '0'],
      ['width', '0'],
      ['height', '0'],
      ['z-index', '2147483647'],
      ['overflow', 'visible'],
      ['transform', 'none'],
      ['zoom', '1'],
      ['display', 'block'],
    ]
    for (const [prop, val] of overrides) {
      host.style.setProperty(prop, val, 'important')
    }
  }, [])

  const hideWidget = useCallback(() => {
    setWidget((prev) => ({ ...prev, visible: false }))
  }, [])

  useEffect(() => {
    const handleMessage = async (message: ShowWidgetMessage) => {
      if (message.type !== "SHOW_WIDGET") return

      const settings = await getSettings()

      setWidget({
        visible: true,
        text: message.text,
        sourceUrl: window.location.href,
        position: message.position,
        theme: message.settings.theme,
        autoDismiss: message.settings.autoDismiss,
        dismissTimer: message.settings.dismissTimer,
        includeSourceUrl: settings.includeSourceUrl ?? false,
        includeDateTime: settings.includeDateTime ?? false,
        includeStamp: settings.includeStamp ?? false,
        includeDatabases: settings.includeDatabases ?? false,
        defaultDestinationMode: settings.defaultDestinationMode ?? 'fixed',
        defaultDestination: message.defaultDestination,
        isPro: message.settings.isPro,
      })
    }

    chrome.runtime.onMessage.addListener(handleMessage)
    return () => chrome.runtime.onMessage.removeListener(handleMessage)
  }, [])

  // Dismiss on Escape key.
  // Guard with isTrusted so synthetic keydown events dispatched by LLM sites
  // (e.g. Genspark fires a fake Escape when focus moves into the shadow DOM)
  // don't accidentally close the widget.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!e.isTrusted) return
      if (e.key === "Escape" && widget.visible) hideWidget()
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [widget.visible, hideWidget])

  // Dismiss on click outside the widget.
  // Uses bounding-rect hit testing on the actual rendered element rather than
  // composedPath / e.target retargeting, which Genspark (and other LLM SPAs)
  // interfere with via their own capture-phase handlers and event re-dispatching.
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!e.isTrusted) return
      if (isDraggingRef.current) return
      if (!widget.visible) return

      // Primary: bounding-rect check against the actual rendered widget element.
      // This is fully independent of shadow DOM event mechanics and site-specific
      // event handling — if the click coordinates land inside the widget, keep it open.
      const el = widgetElRef.current
      if (el) {
        const rect = el.getBoundingClientRect()
        if (
          e.clientX >= rect.left && e.clientX <= rect.right &&
          e.clientY >= rect.top  && e.clientY <= rect.bottom
        ) return
      }

      // Fallback: composedPath / target checks (for any browser that can't do the above)
      const shadowHost = document.getElementById('clipflow-widget-host')
      if (shadowHost) {
        if (e.target === shadowHost) return
        if (e.composedPath().includes(shadowHost)) return
      }

      hideWidget()
    }
    document.addEventListener("click", handleClickOutside, true)
    return () => document.removeEventListener("click", handleClickOutside, true)
  }, [widget.visible, hideWidget])

  if (!widget.visible) return null

  const persistSettings = async (patch: Partial<WidgetState>) => {
    const current = await getSettings()
    await chrome.storage.local.set({ settings: { ...current, ...patch } })
  }

  return (
    <QuickSaveView
      widgetRef={widgetElRef}
      position={widget.position}
      onClose={hideWidget}
      clipboardContent={widget.text}
      sourceUrl={widget.sourceUrl}
      onPositionChange={(pos) => setWidget((prev) => ({ ...prev, position: pos }))}
      onDragStateChange={(dragging) => { isDraggingRef.current = dragging }}
      theme={widget.theme}
      onThemeChange={(theme) => { setWidget((prev) => ({ ...prev, theme })); persistSettings({ theme }) }}
      autoDismiss={widget.autoDismiss}
      dismissTimer={widget.dismissTimer}
      onAutoDismissChange={(autoDismiss) => { setWidget((prev) => ({ ...prev, autoDismiss })); persistSettings({ autoDismiss }) }}
      onDismissTimerChange={(dismissTimer) => { setWidget((prev) => ({ ...prev, dismissTimer })); persistSettings({ dismissTimer }) }}
      includeSourceUrl={widget.includeSourceUrl}
      includeDateTime={widget.includeDateTime}
      includeStamp={widget.includeStamp}
      includeDatabases={widget.includeDatabases}
      defaultDestinationMode={widget.defaultDestinationMode}
      onIncludeSourceUrlChange={(includeSourceUrl) => { setWidget((prev) => ({ ...prev, includeSourceUrl })); persistSettings({ includeSourceUrl }) }}
      onIncludeDateTimeChange={(includeDateTime) => { setWidget((prev) => ({ ...prev, includeDateTime })); persistSettings({ includeDateTime }) }}
      onIncludeStampChange={(includeStamp) => { setWidget((prev) => ({ ...prev, includeStamp })); persistSettings({ includeStamp }) }}
      onIncludeDatabasesChange={(includeDatabases) => { setWidget((prev) => ({ ...prev, includeDatabases })); persistSettings({ includeDatabases }) }}
      onDefaultDestinationModeChange={(defaultDestinationMode) => { setWidget((prev) => ({ ...prev, defaultDestinationMode })); persistSettings({ defaultDestinationMode }) }}
      defaultDestination={widget.defaultDestination}
      isPro={widget.isPro}
    />
  )
}
