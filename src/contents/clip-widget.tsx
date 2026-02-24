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
  defaultDestination: { id: string; emoji: string; name: string } | null
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
    defaultDestination: null,
  })

  const isDraggingRef = useRef(false)

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
        theme: settings.theme,
        autoDismiss: settings.autoDismiss,
        dismissTimer: settings.dismissTimer,
        includeSourceUrl: settings.includeSourceUrl ?? false,
        includeDateTime: settings.includeDateTime ?? false,
        defaultDestination: message.defaultDestination ?? null,
      })
    }

    chrome.runtime.onMessage.addListener(handleMessage)
    return () => chrome.runtime.onMessage.removeListener(handleMessage)
  }, [])

  // Dismiss on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && widget.visible) hideWidget()
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [widget.visible, hideWidget])

  // Dismiss on click outside the shadow root (but not during/after drag)
  useEffect(() => {
    const handleClickOutside = () => {
      if (isDraggingRef.current) return
      if (widget.visible) hideWidget()
    }
    document.addEventListener("click", handleClickOutside)
    return () => document.removeEventListener("click", handleClickOutside)
  }, [widget.visible, hideWidget])

  if (!widget.visible) return null

  const persistSettings = async (patch: Partial<WidgetState>) => {
    const current = await getSettings()
    await chrome.storage.local.set({ settings: { ...current, ...patch } })
  }

  return (
    <QuickSaveView
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
      onIncludeSourceUrlChange={(includeSourceUrl) => { setWidget((prev) => ({ ...prev, includeSourceUrl })); persistSettings({ includeSourceUrl }) }}
      onIncludeDateTimeChange={(includeDateTime) => { setWidget((prev) => ({ ...prev, includeDateTime })); persistSettings({ includeDateTime }) }}
      defaultDestination={widget.defaultDestination}
    />
  )
}
