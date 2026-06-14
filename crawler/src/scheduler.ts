import cron from 'node-cron'
import { config } from './config.js'
import { runAllCrawls } from './runner.js'

let running = false

async function safeRun(): Promise<void> {
  if (running) {
    console.log('[scheduler] Crawl already in progress, skipping')
    return
  }
  running = true
  try {
    await runAllCrawls()
  } catch (err) {
    console.error('[scheduler] Unhandled error:', err)
  } finally {
    running = false
  }
}

export function startScheduler(): void {
  // Convert hours to cron expression: every N hours
  const hours = config.crawlIntervalHours
  const cronExpression = `0 */${hours} * * *`

  console.log(`[scheduler] Starting — will crawl every ${hours} hour(s) (${cronExpression})`)

  cron.schedule(cronExpression, safeRun)

  // Also run immediately on startup
  safeRun().catch(console.error)
}
