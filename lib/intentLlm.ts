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
- "dayToken": one of ${DayTokenSchema.options.join(", ")} ("week" when unsure)
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
  return ParsedIntentSchema.parse(JSON.parse(content));
}
