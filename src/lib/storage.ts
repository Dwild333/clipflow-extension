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
    autoDismiss: boolean
    dismissTimer: number
    widgetEnabled: boolean
    favoritePageIds: string[]
  }

  subscription: {
    isPro: boolean
    status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'none'
    currentPeriodEnd: string | null
    lastChecked: string
  }

  dailySaves: {
    date: string
    count: number
  }

  recentSaves: Array<{
    id: string
    textPreview: string
    destinationId: string
    destinationName: string
    destinationEmoji: string
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
  autoDismiss: false,
  dismissTimer: 5,
  widgetEnabled: true,
  favoritePageIds: [],
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
