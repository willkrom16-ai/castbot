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
      await page.goto('https://actorsaccess.com/', { waitUntil: 'networkidle', timeout: 30000 })
      await page.waitForTimeout(2000)

      await page.evaluate(([u, p]) => {
        const setVal = (selector: string, value: string) => {
          const el = document.querySelector(selector) as HTMLInputElement | null
          if (!el) return false
          el.value = value
          el.dispatchEvent(new Event('input', { bubbles: true }))
          el.dispatchEvent(new Event('change', { bubbles: true }))
          return true
        }
        setVal('input[name="username"], input[name="mem_username"]', u)
        setVal('input[type="password"]', p)
      }, [username, password])

      await page.evaluate(() => {
        const btn = document.querySelector('input[type="submit"], button[type="submit"]') as HTMLElement | null
        btn?.click()
      })

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
