const FREE_MONTHLY_LIMIT = 75

export const FREE_HISTORY_LIMIT = 10
export const PRO_HISTORY_LIMIT = 50

export function getHistoryLimit(isPro: boolean): number {
  return isPro ? PRO_HISTORY_LIMIT : FREE_HISTORY_LIMIT
}

export interface SaveCheckResult {
  allowed: boolean
  reason?: string
  remaining?: number
}

export async function canSave(): Promise<SaveCheckResult> {
  const storage = await chrome.storage.local.get(['license', 'usage'])
  const license = storage.license as { is_pro: boolean; expires_at: number } | undefined

  if (license?.is_pro && (license.expires_at === 0 || license.expires_at > Date.now())) {
    return { allowed: true }
  }

  const currentMonth = new Date().toISOString().slice(0, 7)
  const usage = storage.usage as { saves_this_month: number; month: string } | undefined
  const savesThisMonth = usage?.month === currentMonth ? usage.saves_this_month : 0

  if (savesThisMonth >= FREE_MONTHLY_LIMIT) {
    return {
      allowed: false,
      reason: `You've reached your ${FREE_MONTHLY_LIMIT} free saves this month. Upgrade to Pro for unlimited saves.`,
      remaining: 0,
    }
  }

  return { allowed: true, remaining: FREE_MONTHLY_LIMIT - savesThisMonth - 1 }
}

export async function incrementSaveCount() {
  const storage = await chrome.storage.local.get(['usage'])
  const currentMonth = new Date().toISOString().slice(0, 7)
  const usage = storage.usage as { saves_this_month: number; month: string } | undefined
  const savesThisMonth = usage?.month === currentMonth ? usage.saves_this_month : 0

  await chrome.storage.local.set({
    usage: { saves_this_month: savesThisMonth + 1, month: currentMonth },
  })
}

export async function getUsageStats() {
  const storage = await chrome.storage.local.get(['license', 'usage'])
  const license = storage.license as { is_pro: boolean; expires_at: number } | undefined
  const isPro = !!(license?.is_pro && (license.expires_at === 0 || license.expires_at > Date.now()))

  const currentMonth = new Date().toISOString().slice(0, 7)
  const usage = storage.usage as { saves_this_month: number; month: string } | undefined
  const savesThisMonth = usage?.month === currentMonth ? (usage.saves_this_month ?? 0) : 0

  return {
    saves_this_month: savesThisMonth,
    limit: isPro ? Infinity : FREE_MONTHLY_LIMIT,
    is_pro: isPro,
  }
}
