export interface ClipperStorage {
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
    defaultDestinationType: 'page' | 'database'
    autoDismiss: boolean
    dismissTimer: number
    widgetEnabled: boolean
    favoritePageIds: string[]
    includeSourceUrl: boolean
    includeDateTime: boolean
    includeStamp: boolean
    defaultDestinationMode: 'fixed' | 'last-saved'
    lastSavedDestinationId: string | null
    lastSavedDestinationEmoji: string
    lastSavedDestinationName: string
    lastSavedDestinationIconUrl: string | null
    lastSavedDestinationType: 'page' | 'database'
    newPageParentId: string | null
    newPageParentEmoji: string
    newPageParentName: string
    newPageParentIconUrl: string | null
    newPageParentType: 'page' | 'database'
    includeDatabases: boolean
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
    destinationType?: 'page' | 'database'
    savedAt: string
    sourceUrl: string
  }>

  onboardingComplete: boolean
}

export const DEFAULT_SETTINGS: ClipperStorage['settings'] = {
  theme: 'dark',
  defaultDestinationId: null,
  defaultDestinationEmoji: '📝',
  defaultDestinationName: 'Choose a page',
  defaultDestinationIconUrl: null,
  defaultDestinationType: 'page' as const,
  autoDismiss: false,
  dismissTimer: 5,
  widgetEnabled: true,
  favoritePageIds: [],
  includeSourceUrl: false,
  includeDateTime: false,
  includeStamp: false,
  defaultDestinationMode: 'fixed',
  lastSavedDestinationId: null,
  lastSavedDestinationEmoji: '📝',
  lastSavedDestinationName: 'Last saved page',
  lastSavedDestinationIconUrl: null,
  lastSavedDestinationType: 'page' as const,
  newPageParentId: null,
  newPageParentEmoji: '📄',
  newPageParentName: 'Choose a parent page',
  newPageParentIconUrl: null,
  newPageParentType: 'page' as const,
  includeDatabases: false,
}

export async function getStorage<K extends keyof ClipperStorage>(
  key: K
): Promise<ClipperStorage[K] | undefined> {
  const result = await chrome.storage.local.get(key)
  return result[key]
}

export async function setStorage<K extends keyof ClipperStorage>(
  key: K,
  value: ClipperStorage[K]
): Promise<void> {
  await chrome.storage.local.set({ [key]: value })
}

export async function getSettings(): Promise<ClipperStorage['settings']> {
  const settings = await getStorage('settings')
  if (!settings) return DEFAULT_SETTINGS
  // Merge with defaults to ensure new fields are present for existing users
  return { 
    ...DEFAULT_SETTINGS, 
    ...settings, 
    dismissTimer: Math.min(settings.dismissTimer ?? 5, 10) 
  }
}
