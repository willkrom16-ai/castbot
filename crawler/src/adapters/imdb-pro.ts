import { Page } from 'playwright'
import { BaseAdapter } from './base.js'
import { ListingResult } from '../types.js'
import { newPage, newLoginPage } from '../browser.js'

// Note: IMDB Pro is primarily a research tool (casting director contacts, project status).
// We crawl the "In Development" and production listings that mention open casting.
export class ImdbProAdapter extends BaseAdapter {
  readonly site = 'imdb_pro' as const
  readonly defaultSearchUrl = 'https://pro.imdb.com/projects'

  protected async login(): Promise<void> {
    const { username, password } = this.credentials()
    const ctx = await this.getContext()
    const page = await newLoginPage(ctx)

    try {
      await page.goto('https://www.imdb.com/ap/signin?openid.return_to=https://pro.imdb.com/', { waitUntil: 'domcontentloaded', timeout: 30000 })
      await page.waitForTimeout(2000)

      // Step 1: fill email and click continue (Amazon may be two-step)
      await page.evaluate(`
        (function() {
          function setVal(sel, val) {
            var el = document.querySelector(sel);
            if (!el) return;
            el.value = val;
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
          }
          setVal('input[name="email"], #ap_email', ${JSON.stringify(username)});
          var cont = document.querySelector('input[id="continue"], #continue');
          if (cont) cont.click();
        })()
      `)

      await page.waitForTimeout(2000)

      // Step 2: fill password and submit
      await page.evaluate(`
        (function() {
          function setVal(sel, val) {
            var el = document.querySelector(sel);
            if (!el) return;
            el.value = val;
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
          }
          setVal('input[name="password"], #ap_password', ${JSON.stringify(password)});
          var btn = document.querySelector('input[id="signInSubmit"], input[type="submit"]');
          if (btn) btn.click();
        })()
      `)

      await page.waitForURL(/pro\.imdb\.com/, { timeout: 25000 })
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
      const selectors = [
        '[class*="project-detail"]',
        '[class*="title-detail"]',
        'main',
        '[role="main"]',
        '.ipc-page-content-container',
        '.content',
      ]

      for (const sel of selectors) {
        const el = document.querySelector(sel)
        if (el && el.textContent && el.textContent.trim().length > 200) {
          return el.textContent.trim()
        }
      }

      const noise = document.querySelectorAll('nav, footer, header, script, style')
      noise.forEach(el => el.remove())
      return document.body.innerText.trim()
    })

    const title = await page.title()
    return { url, title, rawText: text }
  }
}
