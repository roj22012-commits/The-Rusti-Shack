import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { MANAGER_COOKIE_NAME, verifySessionCookieValue } from "@/lib/manager-auth";
import { buildAssistantContext } from "@/lib/assistant-context";
import { askGemini } from "@/lib/gemini";

// Guardrail: a call cap per day. This resets on a cold start/redeploy
// (in-memory, not DB-backed) -- a real production version should persist
// this in Supabase, but it still bounds runaway usage within a warm
// instance, which is the realistic abuse case for a low-traffic internal
// tool like this one. See the Part D write-up for the full reasoning.
const DAILY_CALL_CAP = 60;
const usageByDay = new Map<string, number>();

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

const SYSTEM_PROMPT = `You are a read-only data assistant built into The Rusti Shack's private management
back office. You help Rusti, the owner, understand her own business.

Hard rules, no exceptions:
1. Answer ONLY using the JSON data block provided in the user message. Never use outside/web
   knowledge, never invent a number, and never guess at anything not present in the data. If
   the data doesn't answer the question, say so plainly instead of making something up.
2. You have no ability to change, delete, or write anything -- you are read-only by construction.
   If asked to do something other than answer a question about the provided data, decline.
3. The data you're given is already de-identified: there are no customer names, emails, phone
   numbers, or addresses anywhere in it, only aggregate counts and anonymous segment/SKU-level
   figures. Never claim to have access to individual customer identities, because you don't.
4. If a chart would help, include one with at most 15 data points (pick the most relevant top 15
   if there would be more). Otherwise leave chart null.
5. Stay strictly in the lane of this shop's own sales/inventory/customer/staff data. Politely
   decline unrelated requests (general knowledge, other businesses, anything outside the
   provided data).
6. Format the written answer with light markdown (bold, short tables) where it helps readability.

Respond only in the required JSON schema.`;

export async function POST(req: Request) {
  const jar = await cookies();
  const session = jar.get(MANAGER_COOKIE_NAME)?.value;
  if (!verifySessionCookieValue(session)) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }

  const key = todayKey();
  const used = usageByDay.get(key) ?? 0;
  if (used >= DAILY_CALL_CAP) {
    return NextResponse.json(
      { error: "The assistant has hit its daily question cap. Try again tomorrow." },
      { status: 429 }
    );
  }

  let body: { question?: string; history?: { question: string; answer: string }[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const question = body.question?.trim();
  if (!question || question.length > 500) {
    return NextResponse.json({ error: "Send a question (under 500 characters)." }, { status: 400 });
  }

  try {
    const context = await buildAssistantContext();
    const history = (body.history ?? []).slice(-4);
    const historyText = history
      .map((h) => `Previous Q: ${h.question}\nPrevious A: ${h.answer}`)
      .join("\n\n");

    const userPrompt = `Shop data (JSON):\n${JSON.stringify(context)}\n\n${
      historyText ? `Recent conversation:\n${historyText}\n\n` : ""
    }Question: ${question}`;

    const { result, promptTokens, outputTokens } = await askGemini(SYSTEM_PROMPT, userPrompt);

    usageByDay.set(key, used + 1);

    return NextResponse.json({
      answer: result.answer,
      chart: result.chart,
      usage: { promptTokens, outputTokens, callsToday: used + 1, dailyCap: DAILY_CALL_CAP },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "The assistant hit an error. Try again." },
      { status: 500 }
    );
  }
}
