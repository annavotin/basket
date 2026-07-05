// Supabase Edge Function: estimate-extra
// Receives a free-text dish description, asks Claude Haiku to estimate total calories and
// macros for that portion, and returns { kcal, protein, carbs, fat }. The ANTHROPIC_API_KEY
// lives only here (a Supabase secret, shared with scan-receipt), never in the app. JWT
// verification is enforced by the platform (verify_jwt — the default), so only signed-in
// users can call this.
//
// Deploy:  supabase functions deploy estimate-extra
// Secret:  already set via scan-receipt (ANTHROPIC_API_KEY) — no new secret needed.
import Anthropic from 'npm:@anthropic-ai/sdk'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const PROMPT = `You are estimating nutrition for a home-cooked or restaurant dish based on a
short user-typed description. The description may be casual, include multiple items (e.g.
"burger and fries", "large latte with oat milk"), or be vague — do your best single estimate
for the portion as typically served/eaten. Respond with ONLY valid minified JSON, no markdown,
in exactly this shape, with all four values as numbers (protein/carbs/fat in grams, kcal as
whole calories, all for the TOTAL described portion, not per 100g):
{"kcal":0,"protein":0,"carbs":0,"fat":0}`

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!apiKey) return json({ error: 'ANTHROPIC_API_KEY not configured' }, 500)

    const { description } = await req.json().catch(() => ({}))
    if (typeof description !== 'string' || !description.trim()) {
      return json({ error: 'missing description' }, 400)
    }

    const anthropic = new Anthropic({ apiKey })
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 256,
      messages: [
        { role: 'user', content: `${PROMPT}\n\nDescription: ${description.trim()}` },
      ],
    })

    const text = message.content.find((b) => b.type === 'text')?.text ?? ''
    // Be tolerant of stray prose/markdown fences: pull the first {...} block.
    const match = text.match(/\{[\s\S]*\}/)
    const parsed = match ? JSON.parse(match[0]) : {}
    return json({
      kcal: parsed?.kcal,
      protein: parsed?.protein,
      carbs: parsed?.carbs,
      fat: parsed?.fat,
    })
  } catch (err) {
    return json({ error: String((err as Error)?.message ?? err) }, 500)
  }
})
