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
        await page.waitForTimeout(3000)

        // Actors Access uses legacy frames — search raw HTML for breakdown URL patterns
        // instead of relying on <a href> which may be javascript:void(0)
        const rawHtml = await page.content()

        // Also get HTML from any iframes on the page
        const frameHtmls: string[] = []
        for (const frame of page.frames()) {
          if (frame === page.mainFrame()) continue
          try {
            const fhtml = await frame.content()
            frameHtmls.push(fhtml)
          } catch { /* cross-origin frame, skip */ }
        }

        const allHtml = rawHtml + frameHtmls.join('')

        // Extract all breakdown=NNNNNN URLs from raw HTML.
        // HTML attributes encode & as &amp; so we can't rely on the preceding char —
        // just search for the bare "breakdown=DIGITS" pattern anywhere in the HTML.
        const re = /breakdown=(\d+)/g
        const breakdownIds = new Set<string>()
        let m: RegExpExecArray | null
        while ((m = re.exec(allHtml)) !== null) {
          breakdownIds.add(m[1])
        }

        console.log(`[actors_access] Page ${p + 1}: found ${breakdownIds.size} breakdown IDs in HTML (${frameHtmls.length} extra frames)`)

        // Reconstruct canonical URLs for each breakdown ID
        const pageUrls = Array.from(breakdownIds).map(id =>
          `https://actorsaccess.com/projects/?view=breakdowns&breakdown=${id}&region=5`
        )

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

  // Override fetchListing: Actors Access redirects direct breakdown URL navigation
  // to the login page (server-side session state check). Instead we must land on
  // /projects/ first, click the breakdown link in-page, then extract from frames.
  async fetchListing(url: string): Promise<ListingResult> {
    const breakdownMatch = url.match(/breakdown=(\d+)/)
    if (!breakdownMatch) return { url, title: '', rawText: '' }
    const breakdownId = breakdownMatch[1]

    const ctx = await this.getContext()
    // Use full page (no resource blocking) so iframes and SPA content load properly
    const page = await newLoginPage(ctx)

    try {
      // Step 1: land on the authenticated projects page first
      await page.goto('https://actorsaccess.com/projects/', {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      })
      await page.waitForTimeout(2000)

      // Step 2: search ALL frames for the breakdown link and click it
      // (page.locator only searches main frame; breakdown links are inside iframes)
      let clicked = false
      for (const frame of page.frames()) {
        if (clicked) break
        try {
          const didClick: boolean = await frame.evaluate(`
            (function() {
              var id = '${breakdownId}';
              // Try href-based selectors first
              var el = document.querySelector('a[href*="breakdown=' + id + '"]');
              if (el) { el.click(); return true; }
              // Try onclick-based elements
              var all = Array.from(document.querySelectorAll('[onclick]'));
              for (var i = 0; i < all.length; i++) {
                if ((all[i].getAttribute('onclick') || '').includes(id)) {
                  all[i].click(); return true;
                }
              }
              return false;
            })()
          `)
          if (didClick) { clicked = true; console.log('[actors_access] Clicked breakdown in frame') }
        } catch { /* cross-origin frame, skip */ }
      }

      if (clicked) {
        await page.waitForTimeout(3000)
      } else {
        // Try navigating a child frame directly to the breakdown URL
        // (iframe navigation sends the parent page as Referer, unlike a new tab)
        const childFrames = page.frames().filter(f => f !== page.mainFrame())
        for (const frame of childFrames) {
          try {
            await frame.goto(url, { waitUntil: 'domcontentloaded', timeout: 10000 })
            await page.waitForTimeout(1500)
            const ft: string = await frame.evaluate(`document.body ? document.body.innerText.trim() : ''`)
            if (ft.length > 200 && !ft.toLowerCase().includes('log in')) {
              console.log('[actors_access] Got content via frame.goto')
              return { url, title: await page.title(), rawText: ft }
            }
          } catch { /* frame nav failed, try next */ }
        }
      }

      const title = await page.title()

      // Step 3: collect text from all accessible frames + main page
      let bestText = ''
      for (const frame of page.frames()) {
        try {
          const frameText: string = await frame.evaluate(`
            (function() {
              if (document.title && document.title.toLowerCase().includes('login')) return '';
              var sels = ['#project_details','#role_details','.project-info','.role-info',
                          'table.breakdown','form[name="projectForm"]','main','#main_content','body'];
              for (var i = 0; i < sels.length; i++) {
                var el = document.querySelector(sels[i]);
                if (el && el.innerText && el.innerText.trim().length > 200) {
                  return el.innerText.trim();
                }
              }
              return '';
            })()
          `)
          if (frameText.length > bestText.length) {
            bestText = frameText
          }
        } catch { /* cross-origin or inaccessible frame — skip */ }
      }

      // If still empty, fall back to main page body
      if (bestText.length < 100) {
        bestText = await page.evaluate(`
          (function() {
            var noise = document.querySelectorAll('nav,footer,header,script,style');
            noise.forEach(function(el) { el.remove(); });
            return document.body ? document.body.innerText.trim() : '';
          })()
        `) as string
      }

      // Reject login pages
      if (title.toLowerCase().includes('login') && bestText.length < 500) {
        return { url, title, rawText: '' }
      }

      return { url, title, rawText: bestText }
    } finally {
      await page.close()
    }
  }

}
