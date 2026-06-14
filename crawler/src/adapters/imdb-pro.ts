import { Page } from 'playwright'
import { BaseAdapter } from './base.js'
import { ListingResult } from '../types.js'
import { newPage } from '../browser.js'

// Note: IMDB Pro is primarily a research tool (casting director contacts, project status).
// We crawl the "In Development" and production listings that mention open casting.
export class ImdbProAdapter extends BaseAdapter {
  readonly site = 'imdb_pro' as const
  readonly defaultSearchUrl = 'https://pro.imdb.com/projects'

  protected async login(): Promise<void> {
    const { username, password } = this.credentials()
    const ctx = await this.getContext()
    const page = await newPage(ctx)

    try {
      await page.goto('https://www.imdb.com/ap/signin?openid.return_to=https://pro.imdb.com/', { waitUntil: 'domcontentloaded' })

      await page.fill('input[name="email"], #ap_email', username)
      await page.fill('input[name="password"], #ap_password', password)
      await page.click('input[id="signInSubmit"], input[type="submit"]')

      await page.waitForURL(/pro\.imdb\.com/, { timeout: 20000 })
    } finally {
      await page.close()
    }
  }

  protected async verifySession(): Promise<boolean> {
    const ctx = await this.getContext()
    const page = await newPage(ctx)
    try {
      await page.goto('https://pro.imdb.com/projects', {
        waitUntil: 'domcontentloaded',
        timeout: 15000
      })
      const url = page.url()
      return url.includes('pro.imdb.com') && !url.includes('signin')
    } catch {
      return false
    } finally {
      await page.close()
    }
  }

  async getListingUrls(searchUrl?: string | null): Promise<string[]> {
    const ctx = await this.getContext()
    const page = await newPage(ctx)
    const urls: string[] = []

    try {
      const startUrl = searchUrl ?? this.defaultSearchUrl
      await page.goto(startUrl, { waitUntil: 'domcontentloaded', timeout: 30000 })
      await page.waitForTimeout(2000)

      const pageUrls = await page.evaluate(() => {
        const anchors = Array.from(document.querySelectorAll('a[href]'))
        return anchors
          .map(a => (a as HTMLAnchorElement).href)
          .filter(href => href.includes('pro.imdb.com/project/') || href.includes('pro.imdb.com/title/'))
      })

      urls.push(...pageUrls)
    } finally {
      await page.close()
    }

    return [...new Set(urls)]
  }

  async extractListing(page: Page, url: string): Promise<ListingResult> {
    await page.waitForTimeout(1500)

    const text = await page.evaluate(() => {
      const remove = document.querySelectorAll('nav, footer, header, script, style')
      remove.forEach(el => el.remove())
      return document.body.innerText
    })

    const title = await page.title()
    return { url, title, rawText: text.trim() }
  }
}
