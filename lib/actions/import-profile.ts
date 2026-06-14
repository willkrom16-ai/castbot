"use server"

import { callClaude, parseJsonOutput } from "@/lib/ai/claude"
import { PROFILE_IMPORT_SYSTEM, PROFILE_IMPORT_PROMPT_VERSION, buildProfileImportUserPrompt } from "@/lib/ai/prompts/profile-import-v1"
import type { ProfileFormValues } from "@/lib/schemas/profile"

export type ImportProfileResult =
  | { success: true; extracted: Partial<ProfileFormValues> }
  | { error: string }

export async function importProfileFromUrl(url: string): Promise<ImportProfileResult> {
  let content: string
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; CastBot/1.0)" },
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) return { error: `Could not fetch URL (${res.status})` }
    const html = await res.text()

    // Extract meta tags first — most useful for JS-heavy sites like Wix
    const metaContent: string[] = []
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
    if (titleMatch) metaContent.push(`Title: ${titleMatch[1]}`)

    const metaMatches = html.matchAll(/<meta[^>]+(?:name|property)=["']([^"']+)["'][^>]+content=["']([^"']+)["'][^>]*>/gi)
    for (const m of metaMatches) {
      const key = m[1].toLowerCase()
      if (["description", "og:title", "og:description", "twitter:title", "twitter:description"].includes(key)) {
        metaContent.push(`${m[1]}: ${m[2]}`)
      }
    }

    // Also extract visible body text
    const bodyText = html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s{2,}/g, "\n")
      .trim()
      .slice(0, 6000)

    content = [...metaContent, "", bodyText].join("\n")
  } catch (e) {
    return { error: `Failed to fetch URL: ${e instanceof Error ? e.message : "unknown error"}` }
  }

  return extractFromText(content)
}

export async function importProfileFromText(text: string): Promise<ImportProfileResult> {
  return extractFromText(text)
}

async function extractFromText(content: string): Promise<ImportProfileResult> {
  try {
    const { result } = await callClaude<Partial<ProfileFormValues>>({
      agent: "profile-import",
      promptVersion: PROFILE_IMPORT_PROMPT_VERSION,
      system: PROFILE_IMPORT_SYSTEM,
      userMessage: buildProfileImportUserPrompt(content),
      parseOutput: (text) => {
        const raw = parseJsonOutput(text)
        return raw as Partial<ProfileFormValues>
      },
    })
    return { success: true, extracted: result }
  } catch (e) {
    return { error: `Extraction failed: ${e instanceof Error ? e.message : "unknown error"}` }
  }
}
