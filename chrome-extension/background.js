// Open options on first install
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    chrome.runtime.openOptionsPage()
  }
})

// Open options when toolbar icon is clicked
chrome.action.onClicked.addListener(() => {
  chrome.runtime.openOptionsPage()
})

// Proxy API calls from content scripts — avoids mixed-content blocks on HTTPS pages
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type !== "CASTBOT_ANALYZE") return false

  chrome.storage.sync.get(["castbot_token", "castbot_api_url"], async (items) => {
    const token = items.castbot_token
    const apiBase = items.castbot_api_url || "https://castbot.vercel.app"

    if (!token) {
      sendResponse({ error: "NO_TOKEN" })
      return
    }

    try {
      const res = await fetch(`${apiBase}/api/extension/analyze`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          raw_text: message.raw_text,
          source_url: message.source_url,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
      sendResponse({ ok: true, data })
    } catch (err) {
      sendResponse({ error: err.message || "Fetch failed" })
    }
  })

  return true // keep channel open for async response
})
