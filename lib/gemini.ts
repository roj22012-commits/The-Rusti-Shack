import "server-only";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;
const MODEL = "gemini-flash-latest";
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

export type ChartSpec = {
  type: "bar" | "pie" | "line" | "number";
  title: string;
  data: { label: string; value: number; color?: string }[];
};

export type AssistantAnswer = { answer: string; chart: ChartSpec | null };

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    answer: {
      type: "STRING",
      description: "Plain-language answer, markdown formatting allowed (bold, tables).",
    },
    chart: {
      type: "OBJECT",
      nullable: true,
      properties: {
        type: { type: "STRING", enum: ["bar", "pie", "line", "number"] },
        title: { type: "STRING" },
        data: {
          type: "ARRAY",
          maxItems: 15,
          items: {
            type: "OBJECT",
            properties: {
              label: { type: "STRING" },
              value: { type: "NUMBER" },
            },
            required: ["label", "value"],
          },
        },
      },
      required: ["type", "title", "data"],
    },
  },
  required: ["answer"],
};

export async function askGemini(
  systemPrompt: string,
  userPrompt: string
): Promise<{ result: AssistantAnswer; promptTokens: number; outputTokens: number }> {
  const res = await fetch(`${ENDPOINT}?key=${GEMINI_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
        maxOutputTokens: 2048,
        thinkingConfig: { thinkingBudget: 0 },
        temperature: 0.2,
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gemini request failed: ${res.status} ${text.slice(0, 300)}`);
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini returned no content (possibly blocked or truncated).");

  let parsed: AssistantAnswer;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Gemini returned malformed JSON.");
  }

  if (parsed.chart?.data && parsed.chart.data.length > 15) {
    parsed.chart.data = parsed.chart.data.slice(0, 15);
  }

  return {
    result: parsed,
    promptTokens: data.usageMetadata?.promptTokenCount ?? 0,
    outputTokens: data.usageMetadata?.candidatesTokenCount ?? 0,
  };
}
