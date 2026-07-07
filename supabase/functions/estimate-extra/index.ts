// Supabase Edge Function: estimate-extra
// Receives a free-text dish description and asks Claude Haiku to DECOMPOSE it into itemized
// components (e.g. "burger and fries" -> cheeseburger + french fries), each with an estimated
// portion in grams and Claude's own best-guess nutrition for that portion. The client (see
// src/services/extra-estimate.ts) then grounds each item against USDA FoodData Central where
// possible, falling back to Claude's per-item guess only when there's no database match — this
// function's job is just the decomposition + fallback numbers, not the final answer. The
// ANTHROPIC_API_KEY lives only here (a Supabase secret, shared with scan-receipt), never in the
// app. JWT verification is enforced by the platform (verify_jwt — the default), so only
// signed-in users can call this.
//
// Deploy:  supabase functions deploy estimate-extra
// Secret:  already set via scan-receipt (ANTHROPIC_API_KEY) — no new secret needed.
import Anthropic from 'npm:@anthropic-ai/sdk'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const PROMPT = `You are breaking down a home-cooked or restaurant dish, described casually by a
user, into its component foods so each one can be looked up in a nutrition database. The
description may name one item ("large latte with oat milk") or several ("burger and fries") and
may be vague — use your judgement for what's typically included/served.

For EACH component food, give:
- "item": a short, generic, database-searchable name (e.g. "cheeseburger", "french fries",
  "oat milk latte") — prefer common/generic terms over brand names unless a brand was named.
- "grams": your best-guess portion size in grams as typically served/eaten.
- "kcal"/"protein"/"carbs"/"fat": YOUR OWN best-guess nutrition for that item's portion (a
  fallback used only if the database has no match — still give your best real estimate, not a
  placeholder).

Respond with ONLY valid minified JSON, no markdown, in exactly this shape (protein/carbs/fat in
grams, kcal as whole calories, 1-6 items):
{"items":[{"item":"","grams":0,"kcal":0,"protein":0,"carbs":0,"fat":0}]}`

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
      max_tokens: 512,
      messages: [
        { role: 'user', content: `${PROMPT}\n\nDescription: ${description.trim()}` },
      ],
    })

    const text = message.content.find((b) => b.type === 'text')?.text ?? ''
    // Be tolerant of stray prose/markdown fences: pull the first {...} block.
    const match = text.match(/\{[\s\S]*\}/)
    const parsed = match ? JSON.parse(match[0]) : {}
    const items = Array.isArray(parsed?.items) ? parsed.items : []
    return json({
      items: items.map((it: any) => ({
        item: it?.item,
        grams: it?.grams,
        kcal: it?.kcal,
        protein: it?.protein,
        carbs: it?.carbs,
        fat: it?.fat,
      })),
    })
  } catch (err) {
    return json({ error: String((err as Error)?.message ?? err) }, 500)
  }
})
