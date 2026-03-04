const API_BASE = 'https://www.notionflow.io'

export interface LicenseStatus {
  is_pro: boolean
  plan: string | null
  current_period_end: string | null
  status: string
  license_type: string | null
}

export async function verifyLicense(email: string): Promise<LicenseStatus> {
  const response = await fetch(`${API_BASE}/api/license/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email.trim().toLowerCase(), app_id: 'clipper' }),
  })
  if (!response.ok) {
    const err = await response.json() as { error?: string }
    throw new Error(err.error ?? 'Failed to verify license')
  }
  return response.json() as Promise<LicenseStatus>
}

export async function getCustomerPortalUrl(email: string): Promise<string> {
  const response = await fetch(`${API_BASE}/api/stripe/portal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email.trim().toLowerCase(), app_id: 'clipper' }),
  })
  if (!response.ok) {
    const err = await response.json() as { error?: string }
    throw new Error(err.error ?? 'Failed to get portal URL')
  }
  const data = await response.json() as { url: string }
  return data.url
}

export async function saveLicenseToStorage(email: string, status: LicenseStatus) {
  await chrome.storage.local.set({
    license: {
      email: email.trim().toLowerCase(),
      is_pro: status.is_pro,
      plan: status.plan,
      verified_at: Date.now(),
      expires_at: status.current_period_end
        ? new Date(status.current_period_end).getTime()
        : 0,
    },
  })
}

export async function getLicenseFromStorage() {
  const result = await chrome.storage.local.get(['license'])
  return (result.license as { email: string | null; is_pro: boolean; plan: string | null; verified_at: number; expires_at: number } | undefined) ?? null
}

export async function clearLicense() {
  await chrome.storage.local.set({
    license: { email: null, is_pro: false, plan: null, verified_at: 0, expires_at: 0 },
  })
}
