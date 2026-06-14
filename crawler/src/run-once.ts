import 'dotenv/config'
import { runAllCrawls } from './runner.js'
import { closeBrowser } from './browser.js'

console.log('[castbot-crawler] Running one-time crawl')
runAllCrawls()
  .then(() => {
    console.log('[castbot-crawler] Done')
    process.exit(0)
  })
  .catch(err => {
    console.error('[castbot-crawler] Error:', err)
    process.exit(1)
  })
  .finally(() => closeBrowser())
