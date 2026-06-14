const tokenInput = document.getElementById("token")
const apiUrlInput = document.getElementById("api-url")
const saveBtn = document.getElementById("save-btn")
const clearBtn = document.getElementById("clear-btn")
const statusEl = document.getElementById("status")
const advancedToggle = document.getElementById("advanced-toggle")
const advancedSection = document.getElementById("advanced")

// Load saved values
chrome.storage.sync.get(["castbot_token", "castbot_api_url"], (items) => {
  if (items.castbot_token) tokenInput.value = items.castbot_token
  if (items.castbot_api_url) apiUrlInput.value = items.castbot_api_url
})

advancedToggle.addEventListener("click", () => {
  const open = advancedSection.style.display === "block"
  advancedSection.style.display = open ? "none" : "block"
  advancedToggle.textContent = open ? "Advanced settings" : "Hide advanced"
})

saveBtn.addEventListener("click", () => {
  const token = tokenInput.value.trim()
  const apiUrl = apiUrlInput.value.trim()

  if (!token) {
    showStatus("Token is required.", "error")
    return
  }

  const data = { castbot_token: token }
  if (apiUrl) data.castbot_api_url = apiUrl

  chrome.storage.sync.set(data, () => {
    showStatus("Settings saved.", "success")
  })
})

clearBtn.addEventListener("click", () => {
  chrome.storage.sync.remove(["castbot_token", "castbot_api_url"], () => {
    tokenInput.value = ""
    apiUrlInput.value = ""
    showStatus("Settings cleared.", "success")
  })
})

function showStatus(message, type) {
  statusEl.textContent = message
  statusEl.className = `status ${type}`
  setTimeout(() => { statusEl.className = "status" }, 3000)
}
