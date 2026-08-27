import { z } from "zod";
import { ACTIVITY_DEFAULTS } from "@/lib/intent";
import {
  ActivityKeySchema,
  DayTokenSchema,
  ParsedIntent,
  ParsedIntentSchema,
  PeriodSchema,
} from "@/lib/types";

const LLM_TIMEOUT_MS = 5000;

// Built lazily: intent.ts imports this module, so reading ACTIVITY_DEFAULTS
// at module scope would hit the circular import before it is initialized.
function systemPrompt(): string {
  return `You turn a user's outdoor-activity request into JSON.
Respond with a single JSON object, no prose, no code fences, with exactly these fields:
- "activity": one of ${ActivityKeySchema.options.join(", ")} ("generic" when unsure)
- "activityLabel": short display label for the activity, e.g. "Running"
- "dayToken": one of ${DayTokenSchema.options.join(", ")} — "any" is NOT a valid dayToken; use "week" when no day is mentioned
- "period": one of ${PeriodSchema.options.join(", ")} ("any" when unsure)
- "temp": { "idealMin": number, "idealMax": number } in degrees C
- "maxPrecipProb": number 0-100 (40 unless the text says otherwise; 20 when rain is unwanted, 80 when rain is fine)
- "maxWind": number in km/h (30 unless the text says otherwise; 15 for calm, 60 when wind is fine)
- "requireDaylight": boolean
- "minDurationHours": integer 1-6
Unless the text overrides them, use these per-activity defaults (label, minDurationHours, temp, requireDaylight):
${JSON.stringify(ACTIVITY_DEFAULTS)}`;
}

const CompletionSchema = z.object({
  choices: z.array(z.object({ message: z.object({ content: z.string() }) })).min(1),
});

export async function parseIntentWithLlm(text: string): Promise<ParsedIntent> {
  const baseUrl = process.env.LLM_BASE_URL ?? "https://api.openai.com/v1";
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${process.env.LLM_API_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.LLM_MODEL ?? "gpt-4o-mini",
      temperature: 0,
      max_tokens: 300,
      messages: [
        { role: "system", content: systemPrompt() },
        { role: "user", content: text },
      ],
    }),
    signal: AbortSignal.timeout(LLM_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`LLM endpoint returned status ${res.status}`);
  const completion = CompletionSchema.parse(await res.json());
  const content = completion.choices[0].message.content.replace(/```(?:json)?/g, "").trim();
  return ParsedIntentSchema.parse(withEnumDefaults(JSON.parse(content)));
}

// Models sometimes bleed one enum into another (observed: dayToken "any").
// Map invalid enum values to their documented defaults; everything else stays
// strictly validated by ParsedIntentSchema, which remains the gate.
function withEnumDefaults(raw: unknown): unknown {
  if (typeof raw !== "object" || raw === null) return raw;
  const obj = { ...(raw as Record<string, unknown>) };
  if (!ActivityKeySchema.safeParse(obj.activity).success) obj.activity = "generic";
  if (!DayTokenSchema.safeParse(obj.dayToken).success) obj.dayToken = "week";
  if (!PeriodSchema.safeParse(obj.period).success) obj.period = "any";
  return obj;
}
