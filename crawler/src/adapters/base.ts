import { BrowserContext, Page } from 'playwright'
import { SiteName, ListingResult } from '../types.js'
import { config } from '../config.js'
import { sessionExists, loadSession, newContext, saveSession, newPage } from '../browser.js'

export abstract class BaseAdapter {
  abstract readonly site: SiteName
  abstract readonly defaultSearchUrl: string

  protected context: BrowserContext | null = null

  async ensureLoggedIn(): Promise<void> {
    if (sessionExists(this.site)) {
      console.log(`[${this.site}] Restoring saved session`)
      this.context = await loadSession(this.site)
      // Verify session is still valid
      const valid = await this.verifySession()
      if (valid) return
      console.log(`[${this.site}] Session expired, re-logging in`)
      await this.context.close()
    }

    console.log(`[${this.site}] Logging in`)
    this.context = await newContext()
    await this.login()
    await saveSession(this.context, this.site)
    console.log(`[${this.site}] Login successful, session saved`)
  }

  protected abstract login(): Promise<void>
  protected abstract verifySession(): Promise<boolean>
  abstract getListingUrls(searchUrl?: string | null): Promise<string[]>
  abstract extractListing(page: Page, url: string): Promise<ListingResult>

  async getContext(): Promise<BrowserContext> {
    if (!this.context) throw new Error(`${this.site}: call ensureLoggedIn() first`)
    return this.context
  }

  async close(): Promise<void> {
    if (this.context) {
      await this.context.close()
      this.context = null
    }
  }

  protected credentials() {
    return config.credentials[this.site]
  }

  async fetchListing(url: string): Promise<ListingResult> {
    const ctx = await this.getContext()
    const page = await newPage(ctx)
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 })
      return await this.extractListing(page, url)
    } finally {
      await page.close()
    }
  }
}
