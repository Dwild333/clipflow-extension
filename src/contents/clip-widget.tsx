import { useState, useEffect, useCallback } from "react"
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
    defaultDestination: null,
  })

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

  // Dismiss on click outside the shadow root
  useEffect(() => {
    const handleClickOutside = () => {
      if (widget.visible) hideWidget()
    }
    document.addEventListener("click", handleClickOutside)
    return () => document.removeEventListener("click", handleClickOutside)
  }, [widget.visible, hideWidget])

  if (!widget.visible) return null

  return (
    <QuickSaveView
      position={widget.position}
      onClose={hideWidget}
      clipboardContent={widget.text}
      sourceUrl={widget.sourceUrl}
      onPositionChange={(pos) => setWidget((prev) => ({ ...prev, position: pos }))}
      theme={widget.theme}
      onThemeChange={(theme) => setWidget((prev) => ({ ...prev, theme }))}
      autoDismiss={widget.autoDismiss}
      dismissTimer={widget.dismissTimer}
      defaultDestination={widget.defaultDestination}
    />
  )
}
