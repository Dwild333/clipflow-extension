import { setStorage } from "./storage"

/** Replace with your deployed Netlify function URL */
export const TOKEN_EXCHANGE_URL =
  process.env.PLASMO_PUBLIC_TOKEN_EXCHANGE_URL ||
  "https://clipflow.tools/.netlify/functions/notion-oauth-exchange"

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

/** Launch the OAuth flow using chrome.identity.launchWebAuthFlow */
export async function launchNotionOAuth(): Promise<void> {
  const authUrl = buildAuthUrl()

  return new Promise((resolve, reject) => {
    chrome.identity.launchWebAuthFlow(
      { url: authUrl, interactive: true },
      async (redirectUrl) => {
        if (chrome.runtime.lastError || !redirectUrl) {
          reject(new Error(chrome.runtime.lastError?.message || "OAuth cancelled"))
          return
        }

        try {
          const url = new URL(redirectUrl)
          const code = url.searchParams.get("code")
          const error = url.searchParams.get("error")

          if (error) {
            reject(new Error(`Notion OAuth error: ${error}`))
            return
          }
          if (!code) {
            reject(new Error("No authorization code received"))
            return
          }

          await exchangeCodeForToken(code)
          resolve()
        } catch (err) {
          reject(err)
        }
      }
    )
  })
}

/** Exchange the auth code for an access token via our serverless function */
async function exchangeCodeForToken(code: string): Promise<void> {
  const res = await fetch(TOKEN_EXCHANGE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, redirect_uri: REDIRECT_URI }),
  })

  if (!res.ok) {
    const err = await res.json() as { error?: string }
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
}

/** Disconnect — clear auth from storage */
export async function disconnectNotion(): Promise<void> {
  await setStorage("auth", null)
}
