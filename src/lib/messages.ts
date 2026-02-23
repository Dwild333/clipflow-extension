export type MessageType =
  | 'COPY_DETECTED'
  | 'SHOW_WIDGET'
  | 'HIDE_WIDGET'
  | 'SAVE_TO_NOTION'
  | 'SAVE_RESULT'
  | 'NOTION_CONNECT'
  | 'NOTION_DISCONNECT'
  | 'SEARCH_PAGES'
  | 'GET_AUTH_STATE'
  | 'GET_SETTINGS'
  | 'SETTINGS_RESULT'

export interface CopyDetectedMessage {
  type: 'COPY_DETECTED'
  text: string
  position: { x: number; y: number }
  sourceUrl: string
}

export interface ShowWidgetMessage {
  type: 'SHOW_WIDGET'
  text: string
  position: { x: number; y: number }
  defaultDestination: { id: string; emoji: string; name: string } | null
  settings: {
    theme: 'dark' | 'light'
    autoDismiss: boolean
    dismissTimer: number
  }
}

export interface SaveToNotionMessage {
  type: 'SAVE_TO_NOTION'
  text: string
  destinationId: string
  destinationName: string
  destinationEmoji: string
  sourceUrl: string
}

export interface SaveResultMessage {
  type: 'SAVE_RESULT'
  success: boolean
  error?: string
}

export interface NotionConnectMessage {
  type: 'NOTION_CONNECT'
}

export interface NotionDisconnectMessage {
  type: 'NOTION_DISCONNECT'
}

export interface SearchPagesMessage {
  type: 'SEARCH_PAGES'
  query: string
}

export interface GetAuthStateMessage {
  type: 'GET_AUTH_STATE'
}

export type ExtensionMessage =
  | CopyDetectedMessage
  | ShowWidgetMessage
  | SaveToNotionMessage
  | SaveResultMessage
  | NotionConnectMessage
  | NotionDisconnectMessage
  | SearchPagesMessage
  | GetAuthStateMessage
