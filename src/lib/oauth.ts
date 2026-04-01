import { setStorage } from "./storage"

export const TOKEN_EXCHANGE_URL =
  process.env.PLASMO_PUBLIC_TOKEN_EXCHANGE_URL ||
  "https://clipper-api-seven.vercel.app/api/notion-oauth"

/** The Notion OAuth client ID (public — safe to embed) */
export const NOTION_CLIENT_ID =
  process.env.PLASMO_PUBLIC_NOTION_CLIENT_ID || ""

/** The redirect URI Notion will send the user back to after auth */
export const REDIRECT_URI =
  `https://${chrome.runtime.id}.chromiumapp.org/`

/** Build the Notion OAuth authorization URL */
export function buildAuthUrl(): string {
  const params = new URLSearchParams({
    client_id: NOTION_CLIENT_ID,
    response_type: "code",
    owner: "user",
    redirect_uri: REDIRECT_URI,
  })
  return `https://api.notion.com/v1/oauth/authorize?${params}`
}

export interface NotionOAuthResult {
  accessToken: string
  workspaceId: string
  workspaceName: string
  workspaceIcon?: string
  botId: string
}

/** Launch the OAuth flow using chrome.identity.launchWebAuthFlow */
export async function launchNotionOAuth(): Promise<NotionOAuthResult> {
  const authUrl = buildAuthUrl()
  console.log('[NotionOAuth] Auth URL:', authUrl)
  console.log('[NotionOAuth] Redirect URI:', REDIRECT_URI)

  return new Promise((resolve, reject) => {
    chrome.identity.launchWebAuthFlow(
      { url: authUrl, interactive: true },
      async (redirectUrl) => {
        console.log('[NotionOAuth] Redirect callback fired, url:', redirectUrl)
        console.log('[NotionOAuth] lastError:', chrome.runtime.lastError)
        if (chrome.runtime.lastError || !redirectUrl) {
          reject(new Error(chrome.runtime.lastError?.message || "OAuth cancelled"))
          return
        }

        try {
          const url = new URL(redirectUrl)
          const code = url.searchParams.get("code")
          const error = url.searchParams.get("error")
          console.log('[NotionOAuth] code:', code ? 'present' : 'missing', 'error:', error)

          if (error) {
            reject(new Error(`Notion OAuth error: ${error}`))
            return
          }
          if (!code) {
            reject(new Error("No authorization code received"))
            return
          }

          console.log('[NotionOAuth] Exchanging code for token...')
          const result = await exchangeCodeForToken(code)
          console.log('[NotionOAuth] Token exchange success')
          resolve(result)
        } catch (err) {
          console.error('[NotionOAuth] Token exchange failed:', err)
          reject(err)
        }
      }
    )
  })
}

/** Exchange the auth code for an access token via our serverless function */
async function exchangeCodeForToken(code: string): Promise<NotionOAuthResult> {
  console.log('[TokenExchange] POST to:', TOKEN_EXCHANGE_URL)
  console.log('[TokenExchange] redirect_uri:', REDIRECT_URI)
  const res = await fetch(TOKEN_EXCHANGE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, redirect_uri: REDIRECT_URI }),
  })
  console.log('[TokenExchange] Response status:', res.status)

  if (!res.ok) {
    const err = await res.json() as { error?: string }
    console.error('[TokenExchange] Error response:', err)
    throw new Error(err.error || `Token exchange failed: ${res.status}`)
  }

  const data = await res.json() as {
    access_token: string
    workspace_id: string
    workspace_name: string
    workspace_icon?: string
    bot_id: string
  }

  await setStorage("auth", {
    accessToken: data.access_token,
    workspaceId: data.workspace_id,
    workspaceName: data.workspace_name,
    botId: data.bot_id,
    tokenCreatedAt: new Date().toISOString(),
  })

  return {
    accessToken: data.access_token,
    workspaceId: data.workspace_id,
    workspaceName: data.workspace_name,
    workspaceIcon: data.workspace_icon,
    botId: data.bot_id,
  }
}

/** Disconnect — clear all local user data from storage */
export async function disconnectNotion(): Promise<void> {
  await chrome.storage.local.remove(["auth", "recentSaves", "license", "usage", "onboardingComplete"])
}
