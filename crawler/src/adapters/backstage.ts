import { Page } from 'playwright'
import { BaseAdapter } from './base.js'
import { ListingResult } from '../types.js'
import { newPage, newLoginPage } from '../browser.js'

export class BackstageAdapter extends BaseAdapter {
  readonly site = 'backstage' as const
  readonly defaultSearchUrl = 'https://www.backstage.com/casting-calls/'

  protected async login(): Promise<void> {
    const { username, password } = this.credentials()
    const ctx = await this.getContext()
    const page = await newLoginPage(ctx)

    try {
      await page.goto('https://www.backstage.com/login/', { waitUntil: 'networkidle', timeout: 30000 })
      await page.waitForTimeout(2000)

      // Fill via JS to bypass any visibility/bot-detection issues
      await page.evaluate(([u, p]) => {
        const setVal = (selector: string, value: string) => {
          const el = document.querySelector(selector) as HTMLInputElement | null
          if (!el) return false
          el.value = value
          el.dispatchEvent(new Event('input', { bubbles: true }))
          el.dispatchEvent(new Event('change', { bubbles: true }))
          return true
        }
        setVal('input[type="email"], input[name="email"], #email', u)
        setVal('input[type="password"], input[name="password"], #password', p)
      }, [username, password])

      await page.evaluate(() => {
        const btn = document.querySelector('button[type="submit"], input[type="submit"]') as HTMLElement | null
        btn?.click()
      })

      await page.waitForURL(/backstage\.com\/(?!login)/, { timeout: 20000 })
    } finally {
      await page.close()
    }
  }

  protected async verifySession(): Promise<boolean> {
    const ctx = await this.getContext()
    const page = await newPage(ctx)
    try {
      await page.goto('https://www.backstage.com/casting-calls/', {
        waitUntil: 'domcontentloaded',
        timeout: 15000
      })
      // Check if we're logged in (not redirected to login page)
      const url = page.url()
      return !url.includes('/login')
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

      // Collect listing links from first 3 pages
      for (let p = 0; p < 3; p++) {
        await page.waitForSelector('a[href*="/casting-calls/"], a[href*="/role/"]', { timeout: 10000 }).catch(() => {})

        const pageUrls = await page.evaluate(() => {
          const anchors = Array.from(document.querySelectorAll('a[href]'))
          return anchors
            .map(a => (a as HTMLAnchorElement).href)
            .filter(href =>
              href.includes('/casting-calls/') ||
              href.includes('/role/') ||
              href.match(/backstage\.com\/[^/]+\/casting\//)
            )
        })

        urls.push(...pageUrls)

        // Try to go to next page
        const nextBtn = page.locator('a[aria-label="Next page"], button[aria-label="Next"], [data-testid="pagination-next"]').first()
        if (await nextBtn.count() === 0) break
        await nextBtn.click()
        await page.waitForLoadState('domcontentloaded')
      }
    } finally {
      await page.close()
    }

    // Deduplicate
    return [...new Set(urls)]
  }

  async extractListing(page: Page, url: string): Promise<ListingResult> {
    const text = await page.evaluate(() => {
      // Try to find the main content area first
      const selectors = [
        'article',
        'main',
        '[class*="casting-listing"]',
        '[class*="breakdown"]',
        '[class*="role-detail"]',
        '[class*="job-detail"]',
        '[data-testid*="listing"]',
        '.content',
        '#content',
      ]

      for (const sel of selectors) {
        const el = document.querySelector(sel)
        if (el && el.textContent && el.textContent.trim().length > 200) {
          return el.textContent.trim()
        }
      }

      // Fallback: strip noise and use body
      const noise = document.querySelectorAll('nav, footer, header, [class*="nav"], [class*="menu"], [class*="sidebar"], [class*="ad"], [id*="ad"], script, style, [aria-label="navigation"]')
      noise.forEach(el => el.remove())
      return document.body.innerText.trim()
    })

    const title = await page.title()
    return { url, title, rawText: text }
  }
}
