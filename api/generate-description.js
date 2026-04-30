const fallback = ({ businessName, category, sponsorshipDetails }) => {
  const name = String(businessName || `Local ${category || 'travel'} partner`).trim()
  const offer = String(sponsorshipDetails || 'a creator-friendly sponsorship').trim()

  return `${name} offers a clear ${category || 'travel'} sponsorship for visiting creators. The offer includes ${offer.toLowerCase()}, with final details coordinated by Blue Whale.`
}

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.status(405).json({ error: 'Method not allowed' })
    return
  }

  const apiKey = process.env.OPENAI_API_KEY
  const body = request.body || {}

  if (!apiKey) {
    response.status(200).json({ description: fallback(body), source: 'fallback' })
    return
  }

  try {
    const openAiResponse = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        input: [
          {
            role: 'system',
            content:
              'Write concise English marketplace copy for a travel sponsorship offer. Output one sentence, under 35 words, no markdown.',
          },
          {
            role: 'user',
            content: `Business: ${body.businessName || 'Local partner'}\nCategory: ${body.category || 'Travel'}\nOffer: ${body.sponsorshipDetails || 'Creator sponsorship'}`,
          },
        ],
      }),
    })

    if (!openAiResponse.ok) {
      response.status(200).json({ description: fallback(body), source: 'fallback' })
      return
    }

    const data = await openAiResponse.json()
    const text =
      data.output_text ||
      data.output?.flatMap((item) => item.content || []).find((item) => item.type === 'output_text')?.text ||
      fallback(body)

    response.status(200).json({ description: String(text).trim(), source: 'openai' })
  } catch {
    response.status(200).json({ description: fallback(body), source: 'fallback' })
  }
}
