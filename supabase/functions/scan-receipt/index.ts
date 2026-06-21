// Supabase Edge Function: scan-receipt
// Receives a base64 receipt image, asks Claude Haiku vision to extract grocery line items,
// and returns { lines: [{ name, weightG, kcal, isFood }] }. The ANTHROPIC_API_KEY lives only
// here (a Supabase secret), never in the app. JWT verification is enforced by the platform
// (verify_jwt — the default), so only signed-in users can call this.
//
// Deploy:  supabase functions deploy scan-receipt
// Secret:  supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
import Anthropic from 'npm:@anthropic-ai/sdk'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const PROMPT = `You are reading a photo of a grocery store receipt. Extract every purchased
item as a JSON object. For each line:
- "name": the product, expanded from receipt shorthand into a normal name (e.g. "CHKN THGH 1KG" -> "Chicken thighs").
- "weightG": your best estimate of the total weight in grams. Use, in order: the size printed on the line (e.g. "1KG", "500ML", "x6"); the price as a sanity check (a higher price usually means more/larger quantity, and many items show a unit price like "$/kg" you can divide the line total by); otherwise a typical package size for that product.
- "kcal": your best estimate of the TOTAL calories for that item (not per 100g).
- "isFood": false for non-food lines (totals, subtotals, tax, bag charges, deposits, loyalty), true otherwise.
Skip blank lines and store/header text. Respond with ONLY valid minified JSON, no markdown, in exactly this shape:
{"lines":[{"name":"...","weightG":0,"kcal":0,"isFood":true}]}`

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

    const { image, mediaType } = await req.json().catch(() => ({}))
    if (typeof image !== 'string' || !image) return json({ error: 'missing image' }, 400)

    const anthropic = new Anthropic({ apiKey })
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType || 'image/jpeg', data: image },
            },
            { type: 'text', text: PROMPT },
          ],
        },
      ],
    })

    const text = message.content.find((b) => b.type === 'text')?.text ?? ''
    // Be tolerant of stray prose/markdown fences: pull the first {...} block.
    const match = text.match(/\{[\s\S]*\}/)
    const parsed = match ? JSON.parse(match[0]) : { lines: [] }
    return json({ lines: Array.isArray(parsed?.lines) ? parsed.lines : [] })
  } catch (err) {
    return json({ error: String((err as Error)?.message ?? err) }, 500)
  }
})
