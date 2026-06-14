import { chromium, Browser, BrowserContext, Page } from 'playwright'
import fs from 'fs'
import path from 'path'
import { config } from './config.js'
import { SiteName } from './types.js'

let browser: Browser | null = null

export async function getBrowser(): Promise<Browser> {
  if (!browser || !browser.isConnected()) {
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    })
  }
  return browser
}

export async function closeBrowser(): Promise<void> {
  if (browser) {
    await browser.close()
    browser = null
  }
}

export function sessionPath(site: SiteName): string {
  return path.join(config.sessionDir, `${site}.json`)
}

export function sessionExists(site: SiteName): boolean {
  const p = sessionPath(site)
  if (!fs.existsSync(p)) return false
  // Treat sessions older than 20 hours as expired
  const stat = fs.statSync(p)
  const ageHours = (Date.now() - stat.mtimeMs) / (1000 * 60 * 60)
  return ageHours < 20
}

export async function loadSession(site: SiteName): Promise<BrowserContext> {
  const b = await getBrowser()
  return b.newContext({
    storageState: sessionPath(site),
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 800 },
  })
}

export async function newContext(): Promise<BrowserContext> {
  const b = await getBrowser()
  return b.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 800 },
  })
}

export async function saveSession(context: BrowserContext, site: SiteName): Promise<void> {
  if (!fs.existsSync(config.sessionDir)) {
    fs.mkdirSync(config.sessionDir, { recursive: true })
  }
  await context.storageState({ path: sessionPath(site) })
}

// For crawling listing pages — blocks images/fonts/media for speed
export async function newPage(context: BrowserContext): Promise<Page> {
  const page = await context.newPage()
  await page.route('**/*', (route) => {
    const type = route.request().resourceType()
    if (['image', 'font', 'media'].includes(type)) {
      route.abort()
    } else {
      route.continue()
    }
  })
  return page
}

// For login pages — no resource blocking so forms fully render
export async function newLoginPage(context: BrowserContext): Promise<Page> {
  return context.newPage()
}
