import { Page } from 'playwright'
import { BaseAdapter } from './base.js'
import { ListingResult } from '../types.js'
import { newPage, newLoginPage } from '../browser.js'

export class ActorsAccessAdapter extends BaseAdapter {
  readonly site = 'actors_access' as const
  readonly defaultSearchUrl = 'https://actorsaccess.com/projects/'

  protected async login(): Promise<void> {
    const { username, password } = this.credentials()
    const ctx = await this.getContext()
    const page = await newLoginPage(ctx)

    try {
      await page.goto('https://actorsaccess.com/', { waitUntil: 'domcontentloaded', timeout: 30000 })
      await page.waitForTimeout(3000)

      await page.evaluate(`
        (function() {
          function setVal(sel, val) {
            var el = document.querySelector(sel);
            if (!el) return;
            el.value = val;
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
          }
          setVal('input[name="username"], input[name="mem_username"]', ${JSON.stringify(username)});
          setVal('input[type="password"]', ${JSON.stringify(password)});
          var btn = document.querySelector('input[type="submit"], button[type="submit"]');
          if (btn) btn.click();
        })()
      `)

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
      await page.waitForTimeout(2000)

      // Log current URL and page title for debugging
      const currentUrl = page.url()
      const pageTitle = await page.title()
      console.log(`[actors_access] getListingUrls: landed on "${pageTitle}" at ${currentUrl}`)

      // Capture page console logs for debugging
      page.on('console', msg => {
        if (msg.text().startsWith('[actors_access]')) console.log(msg.text())
      })

      for (let p = 0; p < 5; p++) {
        await page.waitForTimeout(1500)

        const pageUrls = await page.evaluate(`
          (function() {
            var anchors = Array.from(document.querySelectorAll('a[href]'));
            var allHrefs = anchors.map(function(a) { return a.href; });
            console.log('[actors_access] Total anchors: ' + allHrefs.length + ' Sample: ' + JSON.stringify(allHrefs.slice(0, 15)));
            return allHrefs.filter(function(href) {
              // Only individual breakdown listings (breakdown=NNNNNN), not pagination or nav links
              return href.includes('actorsaccess.com') &&
                /[?&]breakdown=\d+/.test(href);
            });
          })()
        `) as string[]

        console.log(`[actors_access] Page ${p + 1}: found ${pageUrls.length} listing URLs`)
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
      const selectors = [
        '#project_details',
        '#role_details',
        '.project-info',
        '.role-info',
        'table.breakdown',
        'form[name="projectForm"]',
        'main',
        '.content-wrapper',
        '#main_content',
      ]

      for (const sel of selectors) {
        const el = document.querySelector(sel)
        if (el && el.textContent && el.textContent.trim().length > 200) {
          return el.textContent.trim()
        }
      }

      const noise = document.querySelectorAll('nav, footer, header, [class*="menu"], script, style')
      noise.forEach(el => el.remove())
      return document.body.innerText.trim()
    })

    const title = await page.title()
    return { url, title, rawText: text }
  }
}
