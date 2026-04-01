import { getStorage, setStorage } from "./storage"
import { getHistoryLimit } from './limits'

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
export async function searchNotionPages(query: string = "", includeDatabases: boolean = false): Promise<NotionPage[]> {
  const headers = await notionHeaders()
  const body: any = {
    query,
    page_size: 100,
  }
  if (!query) {
    body.sort = { direction: "descending", timestamp: "last_edited_time" }
  }
  // Only filter to pages if databases are not included
  if (!includeDatabases) {
    body.filter = { value: "page", property: "object" }
  }
  const res = await fetch(`${NOTION_API}/search`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    await res.json()
    throw new Error(`Notion search failed: ${res.status}`)
  }
  const data = await res.json() as { results: NotionAPIPage[] }
  if (!Array.isArray(data.results)) {
    return []
  }
  return data.results.map(pageFromAPI).filter(p => p.name !== '')
}

const NOTION_CHUNK_SIZE = 1990  // Notion rich_text max is 2000 chars per element
const NOTION_BLOCK_BATCH = 95   // Notion allows max 100 children per request; stay under

/** Split text into ≤2000-char paragraph blocks */
function textToBlocks(text: string): object[] {
  const chunks: string[] = []
  for (let i = 0; i < text.length; i += NOTION_CHUNK_SIZE) {
    chunks.push(text.slice(i, i + NOTION_CHUNK_SIZE))
  }
  return chunks.map((chunk) => ({
    object: "block",
    type: "paragraph",
    paragraph: { rich_text: [{ type: "text", text: { content: chunk } }] },
  }))
}

/** Send blocks in batches of 95 to stay under Notion's 100-block-per-request limit */
async function appendBlocksBatched(pageId: string, blocks: object[], headers: HeadersInit): Promise<void> {
  for (let i = 0; i < blocks.length; i += NOTION_BLOCK_BATCH) {
    const batch = blocks.slice(i, i + NOTION_BLOCK_BATCH)
    const res = await fetch(`${NOTION_API}/blocks/${pageId}/children`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ children: batch }),
    })
    
    if (!res.ok) {
      const err = await res.json() as { message?: string }
      throw new Error(err.message || `Append failed: ${res.status}`)
    }
    await res.json()
  }
}

/** Append a text block (+ optional metadata) to a Notion page */
export async function appendTextToPage(
  pageId: string,
  text: string,
  options?: { sourceUrl?: string; includeDateTime?: boolean; includeStamp?: boolean }
): Promise<void> {
  const headers = await notionHeaders()

  const children: object[] = textToBlocks(text)

  // Optional metadata lines
  const metaParts: string[] = []
  if (options?.includeDateTime) {
    metaParts.push(`🕐 ${new Date().toLocaleString()}`)
  }
  if (options?.sourceUrl) {
    metaParts.push(`🔗 ${options.sourceUrl}`)
  }
  if (metaParts.length > 0) {
    children.push({
      object: "block",
      type: "paragraph",
      paragraph: {
        rich_text: [{ type: "text", text: { content: metaParts.join("  ·  ") }, annotations: { color: "gray" } }],
      },
    })
  }

  // Optional Clipper stamp
  if (options?.includeStamp) {
    children.push({
      object: "block",
      type: "paragraph",
      paragraph: {
        rich_text: [{ type: "text", text: { content: "Saved with Clipper by NotionFlow" }, annotations: { color: "gray", italic: true } }],
      },
    })
  }

  // Empty paragraph as separator so next save doesn't run together
  children.push({
    object: "block",
    type: "paragraph",
    paragraph: { rich_text: [] },
  })

  await appendBlocksBatched(pageId, children, headers)
}

/** Get the title property name for a database */
async function getDatabaseTitleProperty(databaseId: string): Promise<string> {
  const headers = await notionHeaders()
  const res = await fetch(`${NOTION_API}/databases/${databaseId}`, { headers })
  if (!res.ok) return 'Name'  // fallback
  const db = await res.json() as { properties?: Record<string, { type: string }> }
  const titleProp = Object.entries(db.properties || {})
    .find(([_, prop]) => prop.type === 'title')
  return titleProp ? titleProp[0] : 'Name'
}

/** Create a new page in a database with auto-generated title */
export async function createPageInDatabase(
  databaseId: string,
  text: string,
  options?: { sourceUrl?: string; includeDateTime?: boolean; includeStamp?: boolean }
): Promise<NotionPage> {
  const headers = await notionHeaders()
  
  // Generate title from clipped text
  const cleaned = text.trim()
  const title = cleaned.slice(0, 60) + (cleaned.length > 60 ? '...' : '') 
    || `Clipped ${new Date().toLocaleString()}`
  
  // Get the database's title property name
  const titlePropName = await getDatabaseTitleProperty(databaseId)
  
  // Create page in database
  const res = await fetch(`${NOTION_API}/pages`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      parent: { type: 'database_id', database_id: databaseId },
      properties: {
        [titlePropName]: {
          title: [{ type: 'text', text: { content: title } }]
        }
      }
    })
  })
  
  if (!res.ok) {
    const err = await res.json() as { message?: string; code?: string }
      // Provide user-friendly error message
    if (err.code === 'validation_error' || err.message?.includes('required')) {
      throw new Error('This database has required properties that cannot be auto-filled. Please use a simpler database or create pages manually.')
    }
    throw new Error(err.message || 'Failed to create page in database')
  }
  
  const page = await res.json() as NotionAPIPage
  
  // Append content blocks to the newly created page
  await appendTextToPage(page.id, text, options)
  
  return pageFromAPI(page)
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

/** Record a save in recent saves list (10 free / 50 pro) */
export async function recordRecentSave(params: {
  text: string
  destinationId: string
  destinationName: string
  destinationEmoji: string
  destinationIconUrl?: string
  destinationType?: 'page' | 'database'
  sourceUrl: string
}): Promise<void> {
  const storage = await chrome.storage.local.get(['license', 'recentSaves'])
  const license = storage.license as { is_pro: boolean; expires_at: number } | undefined
  const isPro = !!(license?.is_pro && (license.expires_at === 0 || license.expires_at > Date.now()))
  
  const limit = getHistoryLimit(isPro)
  
  const existing = (storage.recentSaves as any[]) ?? []
  const newSave = {
    id: Date.now().toString(),
    textPreview: params.text.slice(0, 300),
    destinationId: params.destinationId,
    destinationName: params.destinationName,
    destinationEmoji: params.destinationEmoji,
    destinationIconUrl: params.destinationIconUrl,
    destinationType: params.destinationType,
    savedAt: new Date().toISOString(),
    sourceUrl: params.sourceUrl,
  }
  const updated = [newSave, ...existing].slice(0, limit)
  await setStorage("recentSaves", updated)
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface NotionPage {
  id: string
  emoji: string
  iconUrl?: string
  name: string
  type: 'page' | 'database'
}

interface NotionAPIPage {
  id: string
  object: 'page' | 'database'
  icon?: {
    type: string
    emoji?: string
    external?: { url: string }
    file?: { url: string; expiry_time?: string }
    custom_emoji?: { id: string; name: string; url: string }
    icon?: { name: string; color: string }
  }
  properties?: {
    title?: { title: Array<{ plain_text: string }> }
    Name?: { title: Array<{ plain_text: string }> }
  }
  title?: Array<{ plain_text: string }>
}

function pageFromAPI(page: NotionAPIPage): NotionPage {
  const iconType = page.icon?.type
  let emoji = "📄"
  let iconUrl: string | undefined

  if (iconType === "emoji") {
    emoji = page.icon?.emoji ?? "📄"
  } else if (iconType === "external") {
    iconUrl = page.icon?.external?.url
  } else if (iconType === "file") {
    iconUrl = page.icon?.file?.url
  } else if (iconType === "custom_emoji") {
    iconUrl = page.icon?.custom_emoji?.url
  } else if (iconType === "icon") {
    const name = page.icon?.icon?.name
    const color = page.icon?.icon?.color || 'gray'
    if (name) iconUrl = `https://www.notion.so/icons/${name}_${color}.svg`
  }
  
  // Get title array - databases have it directly, pages have it in properties
  let titleArr: Array<{ plain_text: string }> = []
  if (page.object === 'database') {
    // Databases have title as a direct property
    titleArr = page.title ?? []
  } else {
    // Pages have title nested in properties
    titleArr = page.properties?.title?.title ?? page.properties?.Name?.title ?? []
  }
  
  // Ensure titleArr is an array before mapping
  const name = Array.isArray(titleArr) 
    ? titleArr.map((t) => t.plain_text).join("")
    : ""
  
  const type = page.object === 'database' ? 'database' : 'page'
  return { id: page.id, emoji, iconUrl, name, type }
}
