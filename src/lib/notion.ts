import { getStorage, setStorage } from "./storage"

const NOTION_VERSION = "2022-06-28"
const NOTION_API = "https://api.notion.com/v1"

/** Build headers for Notion API requests */
async function notionHeaders(): Promise<HeadersInit> {
  const auth = await getStorage("auth")
  if (!auth?.accessToken) throw new Error("Not authenticated")
  return {
    Authorization: `Bearer ${auth.accessToken}`,
    "Content-Type": "application/json",
    "Notion-Version": NOTION_VERSION,
  }
}

/** Search Notion pages/databases accessible to the integration */
export async function searchNotionPages(query: string = ""): Promise<NotionPage[]> {
  const headers = await notionHeaders()
  const res = await fetch(`${NOTION_API}/search`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      query,
      filter: { value: "page", property: "object" },
      sort: { direction: "descending", timestamp: "last_edited_time" },
      page_size: 20,
    }),
  })
  if (!res.ok) throw new Error(`Notion search failed: ${res.status}`)
  const data = await res.json() as { results: NotionAPIPage[] }
  return data.results.map(pageFromAPI)
}

/** Append a text block to a Notion page */
export async function appendTextToPage(pageId: string, text: string): Promise<void> {
  const headers = await notionHeaders()
  const res = await fetch(`${NOTION_API}/blocks/${pageId}/children`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({
      children: [
        {
          object: "block",
          type: "paragraph",
          paragraph: {
            rich_text: [{ type: "text", text: { content: text } }],
          },
        },
      ],
    }),
  })
  if (!res.ok) {
    const err = await res.json() as { message?: string }
    throw new Error(err.message || `Append failed: ${res.status}`)
  }
}

/** Create a new Notion page under a parent page */
export async function createNotionPage(
  parentPageId: string,
  title: string
): Promise<NotionPage> {
  const headers = await notionHeaders()
  const res = await fetch(`${NOTION_API}/pages`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      parent: { type: "page_id", page_id: parentPageId },
      properties: {
        title: {
          title: [{ type: "text", text: { content: title } }],
        },
      },
    }),
  })
  if (!res.ok) {
    const err = await res.json() as { message?: string }
    throw new Error(err.message || `Create page failed: ${res.status}`)
  }
  const data = await res.json() as NotionAPIPage
  return pageFromAPI(data)
}

/** Increment the daily save counter in chrome.storage */
export async function incrementDailySaves(): Promise<void> {
  const today = new Date().toISOString().split("T")[0]
  const existing = await getStorage("dailySaves")
  const count = existing?.date === today ? existing.count + 1 : 1
  await setStorage("dailySaves", { date: today, count })
}

/** Record a save in recent saves list (max 10) */
export async function recordRecentSave(params: {
  text: string
  destinationId: string
  destinationName: string
  destinationEmoji: string
  sourceUrl: string
}): Promise<void> {
  const existing = (await getStorage("recentSaves")) ?? []
  const newSave = {
    id: Date.now().toString(),
    textPreview: params.text.slice(0, 80),
    destinationId: params.destinationId,
    destinationName: params.destinationName,
    destinationEmoji: params.destinationEmoji,
    savedAt: new Date().toISOString(),
    sourceUrl: params.sourceUrl,
  }
  const updated = [newSave, ...existing].slice(0, 10)
  await setStorage("recentSaves", updated)
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface NotionPage {
  id: string
  emoji: string
  name: string
}

interface NotionAPIPage {
  id: string
  icon?: { type: string; emoji?: string }
  properties?: {
    title?: { title: Array<{ plain_text: string }> }
    Name?: { title: Array<{ plain_text: string }> }
  }
  title?: Array<{ plain_text: string }>
}

function pageFromAPI(page: NotionAPIPage): NotionPage {
  const emoji = page.icon?.type === "emoji" ? (page.icon.emoji ?? "📄") : "📄"
  const titleArr =
    page.properties?.title?.title ??
    page.properties?.Name?.title ??
    page.title ??
    []
  const name = titleArr.map((t) => t.plain_text).join("") || "Untitled"
  return { id: page.id, emoji, name }
}
