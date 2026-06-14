import { Page } from 'playwright'
import { BaseAdapter } from './base.js'
import { ListingResult } from '../types.js'
import { newPage } from '../browser.js'

export class ActorsAccessAdapter extends BaseAdapter {
  readonly site = 'actors_access' as const
  readonly defaultSearchUrl = 'https://actorsaccess.com/projects/'

  protected async login(): Promise<void> {
    const { username, password } = this.credentials()
    const ctx = await this.getContext()
    const page = await newPage(ctx)

    try {
      await page.goto('https://actorsaccess.com/', { waitUntil: 'networkidle', timeout: 30000 })

      // Wait for and click the username field (may be hidden until page fully loads)
      const usernameField = page.locator('input[name="username"], input[name="mem_username"]').first()
      await usernameField.waitFor({ state: 'visible', timeout: 15000 })
      await usernameField.fill(username)

      const passwordField = page.locator('input[type="password"]').first()
      await passwordField.fill(password)

      await page.click('input[type="submit"], button[type="submit"]')
      await page.waitForLoadState('networkidle', { timeout: 20000 })
    } finally {
      await page.close()
    }
  }

  protected async verifySession(): Promise<boolean> {
    const ctx = await this.getContext()
    const page = await newPage(ctx)
    try {
      await page.goto('https://actorsaccess.com/projects/', {
        waitUntil: 'domcontentloaded',
        timeout: 15000
      })
      const url = page.url()
      const content = await page.content()
      return !url.includes('login') && !content.includes('Please log in')
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

      for (let p = 0; p < 5; p++) {
        await page.waitForTimeout(1500)

        const pageUrls = await page.evaluate(() => {
          const anchors = Array.from(document.querySelectorAll('a[href]'))
          return anchors
            .map(a => (a as HTMLAnchorElement).href)
            .filter(href =>
              href.includes('/projects/') &&
              href !== 'https://actorsaccess.com/projects/' &&
              /\/projects\/\w/.test(href)
            )
        })

        urls.push(...pageUrls)

        // Next page
        const nextBtn = page.locator('a:has-text("Next"), a[rel="next"]').first()
        if (await nextBtn.count() === 0) break
        await nextBtn.click()
        await page.waitForLoadState('domcontentloaded')
      }
    } finally {
      await page.close()
    }

    return [...new Set(urls)]
  }

  async extractListing(page: Page, url: string): Promise<ListingResult> {
    const text = await page.evaluate(() => {
      const remove = document.querySelectorAll('nav, footer, header, script, style, [class*="menu"]')
      remove.forEach(el => el.remove())
      return document.body.innerText
    })

    const title = await page.title()
    return { url, title, rawText: text.trim() }
  }
}
