type NotifyNewOpportunityOpts = {
  toEmail: string
  roleName: string | null
  projectTitle: string | null
  fitScore: number | null
  recommendedAction: string
  opportunityId: string
}

export async function notifyNewOpportunity(opts: NotifyNewOpportunityOpts) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  const link = `${appUrl}/dashboard`

  const actionLabel: Record<string, string> = {
    SUBMIT: "Strong match — worth submitting",
    REVIEW: "Review recommended",
    SKIP: "Likely not a fit",
    FLAG: "Flagged — needs attention",
  }

  const subject = opts.roleName
    ? `New breakdown: ${opts.roleName}${opts.projectTitle ? ` — ${opts.projectTitle}` : ""}`
    : "New casting breakdown in your queue"

  const lines = [
    "CastBot analyzed a new breakdown for you.",
    "",
    opts.roleName ? `Role: ${opts.roleName}` : null,
    opts.projectTitle ? `Project: ${opts.projectTitle}` : null,
    opts.fitScore !== null ? `Fit score: ${opts.fitScore}/100` : null,
    `Recommendation: ${actionLabel[opts.recommendedAction] ?? opts.recommendedAction}`,
    "",
    `Review and decide here: ${link}`,
  ].filter((l) => l !== null).join("\n")

  const domain = process.env.MAILGUN_DOMAIN ?? ""
  const apiKey = process.env.MAILGUN_API_KEY ?? ""
  const from = `CastBot <mailgun@${domain}>`

  const body = new URLSearchParams({
    from,
    to: opts.toEmail,
    subject,
    text: lines,
  })

  await fetch(`https://api.mailgun.net/v3/${domain}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`api:${apiKey}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  })
}
