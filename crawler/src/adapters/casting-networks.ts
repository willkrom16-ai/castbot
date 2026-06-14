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

      // Wait for SPA to hydrate — try for up to 20s for an input to appear
      await page.waitForSelector('input', { state: 'attached', timeout: 20000 })
      await page.waitForTimeout(2000)

      // Log what inputs are present for debugging
      const inputCount = await page.evaluate(`document.querySelectorAll('input').length`)
      console.log('[casting_networks] Inputs found on login page:', inputCount)
      console.log('[casting_networks] Current URL:', page.url())

      // Fill credentials via JS evaluate (handles React synthetic events)
      await page.evaluate(`
        (function() {
          function setVal(sel, val) {
            var el = document.querySelector(sel);
            if (!el) { console.log('[casting_networks] Selector not found: ' + sel); return false; }
            el.focus();
            el.value = val;
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
            return true;
          }
          var emailOk = setVal('input[type="email"], input[name="email"], input[name="username"]', ${JSON.stringify(username)});
          var passOk = setVal('input[type="password"]', ${JSON.stringify(password)});
          console.log('[casting_networks] email filled:', emailOk, 'pass filled:', passOk);
          var btn = document.querySelector('button[type="submit"], input[type="submit"]');
          if (btn) { btn.click(); console.log('[casting_networks] Submit clicked'); }
          else { console.log('[casting_networks] No submit button found'); }
        })()
      `)

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
