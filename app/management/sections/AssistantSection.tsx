"use client";

import { useState } from "react";
import type { ChartSpec } from "@/lib/gemini";
import AssistantChart from "./AssistantChart";
import MiniMarkdown from "./MiniMarkdown";

type Message = {
  role: "user" | "assistant";
  text: string;
  chart?: ChartSpec | null;
  usage?: { promptTokens: number; outputTokens: number; callsToday: number; dailyCap: number };
  error?: boolean;
};

const SUGGESTIONS = [
  "Which products earn the most profit once cost is factored in?",
  "How do rentals relate to sales for the same products?",
  "Which season is busiest, and by how much?",
  "Which promo codes actually paid for themselves?",
];

export default function AssistantSection() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function ask(question: string) {
    if (!question.trim() || loading) return;
    setInput("");
    setLoading(true);
    setMessages((m) => [...m, { role: "user", text: question }]);

    const history: { question: string; answer: string }[] = [];
    for (let i = 0; i < messages.length - 1; i++) {
      if (messages[i].role === "user" && messages[i + 1].role === "assistant" && !messages[i + 1].error) {
        history.push({ question: messages[i].text, answer: messages[i + 1].text });
      }
    }
    const recentHistory = history.slice(-4);

    try {
      const res = await fetch("/api/manager/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, history: recentHistory }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessages((m) => [...m, { role: "assistant", text: data.error ?? "Something went wrong.", error: true }]);
      } else {
        setMessages((m) => [...m, { role: "assistant", text: data.answer, chart: data.chart, usage: data.usage }]);
      }
    } catch {
      setMessages((m) => [...m, { role: "assistant", text: "Couldn't reach the assistant. Try again.", error: true }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col">
      <div className="rounded-xl bg-sand/40 p-3 text-xs text-foreground/60">
        Answers only from The Rusti Shack&apos;s own sales, inventory, and customer data &mdash; no
        web access, read-only, and no individual customer names or contact details are ever sent
        to the model.
      </div>

      {messages.length === 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => ask(s)}
              className="rounded-full border border-sand-dark px-3 py-1.5 text-xs text-foreground/70 hover:border-ocean-dark"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <div className="mt-4 space-y-4">
        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                m.role === "user"
                  ? "bg-ocean-dark text-white"
                  : m.error
                    ? "bg-coral/10 text-coral"
                    : "bg-sand/50 text-foreground"
              }`}
            >
              {m.role === "assistant" ? <MiniMarkdown text={m.text} /> : m.text}
              {m.chart && <AssistantChart chart={m.chart} />}
              {m.usage && (
                <p className="mt-2 text-[10px] text-foreground/40">
                  {m.usage.promptTokens + m.usage.outputTokens} tokens &middot; question{" "}
                  {m.usage.callsToday}/{m.usage.dailyCap} today &middot; free tier
                </p>
              )}
            </div>
          </div>
        ))}
        {loading && <p className="text-xs text-foreground/50">Thinking...</p>}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(input);
        }}
        className="mt-4 flex gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about the shop's data..."
          maxLength={500}
          className="flex-1 rounded-full border border-sand-dark px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-ocean-dark/40"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="rounded-full bg-ocean-dark px-5 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          Ask
        </button>
      </form>
    </div>
  );
}
