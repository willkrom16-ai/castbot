import { Page } from 'playwright'
import { BaseAdapter } from './base.js'
import { ListingResult } from '../types.js'
import { newPage, newLoginPage } from '../browser.js'

export class CastingNetworksAdapter extends BaseAdapter {
  readonly site = 'casting_networks' as const
  readonly defaultSearchUrl = 'https://app.castingnetworks.com/talent/auditions'

  protected async login(): Promise<void> {
    const { username, password } = this.credentials()
    const ctx = await this.getContext()
    const page = await newLoginPage(ctx)

    try {
      await page.goto('https://app.castingnetworks.com/login', { waitUntil: 'domcontentloaded', timeout: 30000 })
      await page.waitForTimeout(3000)

      console.log('[casting_networks] Login page URL:', page.url())

      // Dismiss cookie consent banner if present
      const cookieBtn = page.locator('button:has-text("Accept"), button:has-text("OK"), button:has-text("Got it"), [id*="cookie"] button').first()
      if (await cookieBtn.count() > 0) {
        await cookieBtn.click().catch(() => {})
        await page.waitForTimeout(1000)
      }

      // Log page state
      const bodyText = await page.evaluate(`document.body ? document.body.innerText.slice(0, 300) : 'no body'`)
      console.log('[casting_networks] Page body preview:', bodyText)

      // Use Playwright native fill — works with React/Angular synthetic events
      await page.locator('input[type="email"], input[name="email"], input[name="username"]').first().fill(username, { timeout: 15000 })
      await page.waitForTimeout(300)
      await page.locator('input[type="password"]').first().fill(password, { timeout: 10000 })
      await page.waitForTimeout(300)

      // Submit
      const submitBtn = page.locator('button[type="submit"], input[type="submit"]').first()
      if (await submitBtn.count() > 0) {
        await submitBtn.click()
      } else {
        await page.keyboard.press('Enter')
      }

      // Wait for navigation away from login — any redirect destination is fine
      await page.waitForFunction(() => !window.location.href.includes('/login'), { timeout: 40000 })
    } finally {
      await page.close()
    }
  }

  protected async verifySession(): Promise<boolean> {
    const ctx = await this.getContext()
    const page = await newPage(ctx)
    try {
      await page.goto('https://app.castingnetworks.com/talent/auditions', {
        waitUntil: 'domcontentloaded',
        timeout: 15000
      })
      const url = page.url()
      return !url.includes('/login') && !url.includes('/signin')
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
      await page.waitForTimeout(2000) // SPA render

      for (let p = 0; p < 5; p++) {
        const pageUrls = await page.evaluate(() => {
          const anchors = Array.from(document.querySelectorAll('a[href]'))
          return anchors
            .map(a => (a as HTMLAnchorElement).href)
            .filter(href =>
              href.includes('/auditions/') ||
              href.includes('/talent/job/') ||
              href.match(/castingnetworks\.com\/talent\/\w+\/\w+/)
            )
        })

        urls.push(...pageUrls)

        const nextBtn = page.locator('[aria-label="Next page"], button:has-text("Next")').first()
        if (await nextBtn.count() === 0) break
        await nextBtn.click()
        await page.waitForTimeout(2000)
      }
    } finally {
      await page.close()
    }

    return [...new Set(urls)]
  }

  async extractListing(page: Page, url: string): Promise<ListingResult> {
    await page.waitForTimeout(2000) // SPA render

    const text = await page.evaluate(() => {
      const selectors = [
        '[class*="audition-detail"]',
        '[class*="job-detail"]',
        '[class*="role-detail"]',
        '[class*="listing-detail"]',
        'main',
        '[role="main"]',
        '.content',
        '#content',
      ]

      for (const sel of selectors) {
        const el = document.querySelector(sel)
        if (el && el.textContent && el.textContent.trim().length > 200) {
          return el.textContent.trim()
        }
      }

      const noise = document.querySelectorAll('nav, footer, header, [class*="sidebar"], [class*="nav"], script, style')
      noise.forEach(el => el.remove())
      return document.body.innerText.trim()
    })

    const title = await page.title()
    return { url, title, rawText: text }
  }
}
