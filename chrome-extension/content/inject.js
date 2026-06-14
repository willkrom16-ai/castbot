// CastBot content script — runs on casting platform pages

let panel = null
let btn = null
let currentResult = null
let analysisState = "idle" // idle | loading | done | error

injectUI()

// Platform-specific role page detection
function isRolePage() {
  const url = window.location.href
  // Backstage role/casting-call detail pages
  if (/backstage\.com\/(casting-calls|breakdowns|jobs)\//.test(url)) return true
  // Casting Networks role detail pages
  if (/castingnetworks\.com\/(role|project|job)/.test(url)) return true
  // Actors Access role pages
  if (/actorsaccess\.com\/(sides|breakdown|role)/.test(url)) return true
  // Fallback: any page with substantial text that looks like a casting notice
  return false
}

// Extract the main role text from the page
function extractRoleText() {
  // Try platform-specific selectors first
  const selectors = [
    // Backstage
    "[data-testid='job-description']",
    ".breakdown-description",
    ".role-description",
    ".job-description",
    // Casting Networks
    ".role-details",
    ".project-details",
    // Actors Access
    ".breakdown-text",
    // Generic fallback
    "article",
    "[role='main']",
    "main",
  ]

  for (const sel of selectors) {
    const el = document.querySelector(sel)
    if (el && el.innerText.trim().length > 100) {
      return el.innerText.trim()
    }
  }

  // Last resort: grab meaningful text from body excluding nav/footer
  const skip = new Set(["NAV", "HEADER", "FOOTER", "SCRIPT", "STYLE", "NOSCRIPT"])
  function getText(node) {
    if (skip.has(node.tagName)) return ""
    if (node.nodeType === Node.TEXT_NODE) return node.textContent
    return Array.from(node.childNodes).map(getText).join(" ")
  }
  const body = document.body
  const text = getText(body).replace(/\s{3,}/g, "\n").trim()
  return text.slice(0, 8000) // cap at 8k chars
}

// Try to find and fill the cover note textarea on the platform
function fillCoverNote(text) {
  const selectors = [
    "textarea[name*='cover']",
    "textarea[name*='note']",
    "textarea[name*='letter']",
    "textarea[placeholder*='cover']",
    "textarea[placeholder*='note']",
    "textarea[placeholder*='letter']",
    "textarea[aria-label*='cover']",
    "textarea[aria-label*='note']",
    "[contenteditable][aria-label*='cover']",
    "[contenteditable][aria-label*='note']",
    // Backstage specific
    "textarea#cover_letter",
    "textarea.cover-letter",
    // Generic last resort
    "textarea",
  ]

  for (const sel of selectors) {
    const el = document.querySelector(sel)
    if (el) {
      el.focus()
      if (el.tagName === "TEXTAREA" || el.tagName === "INPUT") {
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value")?.set
        nativeInputValueSetter?.call(el, text)
        el.dispatchEvent(new Event("input", { bubbles: true }))
        el.dispatchEvent(new Event("change", { bubbles: true }))
      } else {
        el.textContent = text
        el.dispatchEvent(new Event("input", { bubbles: true }))
      }
      el.scrollIntoView({ behavior: "smooth", block: "center" })
      return true
    }
  }
  return false
}

// Try to click the platform's submit/apply button
function clickSubmitButton() {
  const selectors = [
    "button[data-testid*='submit']",
    "button[data-testid*='apply']",
    "a[data-testid*='submit']",
    "button[aria-label*='Submit']",
    "button[aria-label*='Apply']",
  ]
  for (const sel of selectors) {
    const el = document.querySelector(sel)
    if (el) { el.click(); return true }
  }
  // Text-based fallback
  for (const el of document.querySelectorAll("button, a[role='button']")) {
    const t = el.textContent.trim().toLowerCase()
    if (t === "submit" || t === "apply now" || t === "submit now" || t === "submit application") {
      el.click(); return true
    }
  }
  return false
}

function copyToClipboard(text) {
  return navigator.clipboard.writeText(text).catch(() => {
    const ta = document.createElement("textarea")
    ta.value = text
    ta.style.position = "fixed"
    ta.style.opacity = "0"
    document.body.appendChild(ta)
    ta.select()
    document.execCommand("copy")
    document.body.removeChild(ta)
  })
}

// Build the panel DOM
function createPanel() {
  const p = document.createElement("div")
  p.id = "castbot-panel"
  p.innerHTML = `
    <div class="cb-panel-header">
      <div class="cb-panel-header-left">
        <span class="cb-panel-title">CastBot</span>
      </div>
      <button class="cb-close" id="cb-close-btn" title="Close">✕</button>
    </div>
    <div class="cb-panel-body" id="cb-panel-body">
      <div class="cb-loading">
        <div class="cb-spinner"></div>
        <span>Analyzing role…</span>
      </div>
    </div>
    <div class="cb-panel-footer" id="cb-panel-footer" style="display:none"></div>
  `
  document.body.appendChild(p)

  document.getElementById("cb-close-btn").addEventListener("click", closePanel)
  return p
}

function openPanel() {
  if (!panel) panel = createPanel()
  requestAnimationFrame(() => panel.classList.add("cb-open"))
}

function closePanel() {
  if (panel) panel.classList.remove("cb-open")
}

function setDot(state) {
  const dot = btn?.querySelector(".cb-dot")
  if (!dot) return
  dot.className = "cb-dot"
  if (state === "loading") dot.classList.add("cb-loading")
  else if (state === "done") dot.classList.add("cb-ready")
  else if (state === "error") dot.classList.add("cb-error")
}

function renderLoading() {
  document.getElementById("cb-panel-body").innerHTML = `
    <div class="cb-loading">
      <div class="cb-spinner"></div>
      <span>Analyzing role… this takes ~20 seconds</span>
    </div>
  `
  const footer = document.getElementById("cb-panel-footer")
  footer.style.display = "none"
}

function renderNotConfigured() {
  document.getElementById("cb-panel-body").innerHTML = `
    <div class="cb-not-configured">
      <p>CastBot token not set.</p>
      <p>Right-click the CastBot extension icon → Options, then paste your token from the CastBot app.</p>
    </div>
  `
  document.getElementById("cb-panel-footer").style.display = "none"
}

function renderError(message) {
  document.getElementById("cb-panel-body").innerHTML = `
    <div class="cb-error">${escapeHtml(message)}</div>
  `
  document.getElementById("cb-panel-footer").style.display = "none"
}

function renderResult(data) {
  const { should_submit, fit_score, reason, cover_note, self_tape_notes, role_name, project_title } = data
  const score = fit_score ?? null
  const scoreWidth = score != null ? Math.round(score) : 0
  const action = should_submit ? "SUBMIT" : "SKIP"

  const body = document.getElementById("cb-panel-body")
  body.innerHTML = `
    <div>
      <div class="cb-role-title">${escapeHtml(role_name || "Role")}</div>
      <div class="cb-role-project">${escapeHtml(project_title || "")}</div>
    </div>

    <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
      <span class="cb-badge cb-badge-${action}">${action}</span>
      ${score != null ? `
        <div class="cb-score-row" style="flex:1;min-width:120px">
          <span style="font-size:11px;color:#71717a">Fit</span>
          <div class="cb-fit-bar-track">
            <div class="cb-fit-bar-fill" style="width:${scoreWidth}%"></div>
          </div>
          <span class="cb-fit-num">${score}</span>
        </div>` : ""}
    </div>

    ${reason ? `<div class="cb-reasoning">${escapeHtml(reason)}</div>` : ""}

    ${data.headshot_recommendation ? `
      <div style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:#fafafa;border:1px solid #e4e4e7;border-radius:8px;">
        <span style="font-size:18px;">📸</span>
        <span style="font-size:13px;color:#18181b;">Use your <strong>${escapeHtml(data.headshot_recommendation)}</strong> headshot</span>
      </div>` : ""}

    ${cover_note ? `
      <div>
        <div class="cb-section-label">Cover note</div>
        <textarea class="cb-cover-note" id="cb-cover-note">${escapeHtml(cover_note)}</textarea>
      </div>` : ""}

    ${self_tape_notes ? `
      <div>
        <div class="cb-section-label">Self-tape notes</div>
        <div class="cb-tape-notes">${escapeHtml(self_tape_notes)}</div>
      </div>` : ""}
  `

  const footer = document.getElementById("cb-panel-footer")
  footer.style.display = "flex"
  footer.innerHTML = `
    <button class="cb-btn cb-btn-primary" id="cb-submit-btn">Submit to platform</button>
    <button class="cb-btn cb-btn-outline" id="cb-copy-btn">Copy cover note</button>
    <div class="cb-copy-hint" id="cb-copy-hint"></div>
  `

  document.getElementById("cb-submit-btn")?.addEventListener("click", async () => {
    const note = document.getElementById("cb-cover-note")?.value || cover_note || ""
    await copyToClipboard(note)

    const filled = fillCoverNote(note)
    const clicked = clickSubmitButton()

    const hint = document.getElementById("cb-copy-hint")
    if (hint) {
      if (filled || clicked) {
        hint.textContent = "Cover note filled ✓ — complete submission on platform"
      } else {
        hint.textContent = "Cover note copied to clipboard"
      }
      setTimeout(() => { hint.textContent = "" }, 4000)
    }
  })

  document.getElementById("cb-copy-btn")?.addEventListener("click", async () => {
    const note = document.getElementById("cb-cover-note")?.value || cover_note || ""
    await copyToClipboard(note)
    const hint = document.getElementById("cb-copy-hint")
    if (hint) {
      hint.textContent = "Copied ✓"
      setTimeout(() => { hint.textContent = "" }, 2000)
    }
  })
}

function escapeHtml(str) {
  if (!str) return ""
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/\n/g, "<br>")
}

async function analyze() {
  if (analysisState === "loading") return
  analysisState = "loading"
  setDot("loading")
  openPanel()
  renderLoading()

  const roleText = extractRoleText()
  if (!roleText) {
    analysisState = "error"
    setDot("error")
    renderError("Could not extract role text from this page.")
    return
  }

  // Route through background service worker to avoid mixed-content blocks
  chrome.runtime.sendMessage(
    { type: "CASTBOT_ANALYZE", raw_text: roleText, source_url: window.location.href },
    (response) => {
      if (chrome.runtime.lastError) {
        analysisState = "error"
        setDot("error")
        renderError("Extension error: " + chrome.runtime.lastError.message)
        return
      }
      if (response?.error === "NO_TOKEN") {
        analysisState = "error"
        setDot("error")
        renderNotConfigured()
        return
      }
      if (response?.error) {
        analysisState = "error"
        setDot("error")
        renderError(response.error)
        return
      }
      currentResult = response.data
      analysisState = "done"
      setDot("done")
      renderResult(response.data)
    }
  )
}

function injectUI() {
  if (document.getElementById("castbot-btn")) return

  btn = document.createElement("button")
  btn.id = "castbot-btn"
  btn.innerHTML = `<span class="cb-dot"></span> CastBot`
  btn.addEventListener("click", () => {
    if (panel?.classList.contains("cb-open") && analysisState !== "loading") {
      closePanel()
    } else {
      analyze()
    }
  })
  document.body.appendChild(btn)
}

// Re-inject on SPA navigation
let lastUrl = location.href
new MutationObserver(() => {
  if (location.href !== lastUrl) {
    lastUrl = location.href
    analysisState = "idle"
    setDot("idle")
    if (panel) {
      panel.classList.remove("cb-open")
      document.getElementById("cb-panel-body").innerHTML = ""
    }
  }
}).observe(document.body, { subtree: true, childList: true })
