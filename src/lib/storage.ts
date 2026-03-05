export interface ClipFlowStorage {
  auth: {
    accessToken: string | null
    workspaceId: string | null
    workspaceName: string | null
    botId: string | null
    tokenCreatedAt: string
  } | null

  settings: {
    theme: 'dark' | 'light'
    defaultDestinationId: string | null
    defaultDestinationEmoji: string
    defaultDestinationName: string
    defaultDestinationIconUrl: string | null
    autoDismiss: boolean
    dismissTimer: number
    widgetEnabled: boolean
    favoritePageIds: string[]
    includeSourceUrl: boolean
    includeDateTime: boolean
    includeStamp: boolean
    newPageParentId: string | null
    newPageParentEmoji: string
    newPageParentName: string
    newPageParentIconUrl: string | null
  }

  license: {
    email: string | null
    is_pro: boolean
    plan: string | null
    verified_at: number
    expires_at: number
  }

  usage: {
    saves_this_month: number
    month: string
  }

  recentSaves: Array<{
    id: string
    textPreview: string
    destinationId: string
    destinationName: string
    destinationEmoji: string
    destinationIconUrl?: string
    savedAt: string
    sourceUrl: string
  }>

  onboardingComplete: boolean
}

export const DEFAULT_SETTINGS: ClipFlowStorage['settings'] = {
  theme: 'dark',
  defaultDestinationId: null,
  defaultDestinationEmoji: '📝',
  defaultDestinationName: 'Choose a page',
  defaultDestinationIconUrl: null,
  autoDismiss: false,
  dismissTimer: 5,
  widgetEnabled: true,
  favoritePageIds: [],
  includeSourceUrl: false,
  includeDateTime: false,
  includeStamp: false,
  newPageParentId: null,
  newPageParentEmoji: '📄',
  newPageParentName: 'Choose a parent page',
  newPageParentIconUrl: null,
}

export async function getStorage<K extends keyof ClipFlowStorage>(
  key: K
): Promise<ClipFlowStorage[K] | undefined> {
  const result = await chrome.storage.local.get(key)
  return result[key]
}

export async function setStorage<K extends keyof ClipFlowStorage>(
  key: K,
  value: ClipFlowStorage[K]
): Promise<void> {
  await chrome.storage.local.set({ [key]: value })
}

export async function getSettings(): Promise<ClipFlowStorage['settings']> {
  const settings = await getStorage('settings')
  return settings ?? DEFAULT_SETTINGS
}
