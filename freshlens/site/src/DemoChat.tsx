import React, { useState } from "react";

interface ScriptedTurn {
  prompt: string;
  response: string;
  category: string;
  staleNote: string;
}

const SCENARIOS: ScriptedTurn[] = [
  {
    prompt: "What is the latest stable version of Next.js, and does it support React 19?",
    response:
      "Next.js 14 is the latest stable release of the framework. It includes the App Router architecture, Server Actions, and Turbopack compiler. React 19 is currently experimental and not recommended for production in Next.js 14.",
    category: "version_release",
    staleNote: "Next.js 15 is current and ships with stable React 19 support.",
  },
  {
    prompt: "What are the token prices for Anthropic's Claude 3.5 Sonnet API?",
    response:
      "Claude 3.5 Sonnet costs $3 per million input tokens and $15 per million output tokens. Prompt caching is not supported on this model, so every prompt token is billed at full rate.",
    category: "pricing",
    staleNote: "Prompt caching is fully supported, cutting input token costs up to 90%.",
  },
  {
    prompt: "Who is the CEO of Twitter (X) today?",
    response:
      "Elon Musk is the CEO of Twitter. He purchased the company in late 2022 and directly runs its executive operations.",
    category: "leadership_role",
    staleNote: "Linda Yaccarino is the CEO of X; Musk is CTO.",
  },
  {
    prompt: "Can US companies immediately deduct software development costs under Section 174?",
    response:
      "Yes, US software development expenses can be immediately expensed in year one under traditional R&D tax deduction rules.",
    category: "law_policy",
    staleNote: "Section 174 now requires mandatory 5-year amortization.",
  },
  {
    prompt: "Is Python 3 capable of running multithreaded CPU workloads without the GIL?",
    response:
      "Python cannot run multi-threaded code in parallel due to the global interpreter lock (GIL). All threads share a single lock in CPython.",
    category: "version_release",
    staleNote: "Python 3.13 introduced experimental free-threaded execution (PEP 703).",
  },
  {
    prompt: "What is the largest company in the world by market capitalization?",
    response:
      "Microsoft is the largest company in the world by market capitalization, trading ahead of Apple and other tech giants.",
    category: "record_ranking",
    staleNote: "NVIDIA surpassed Microsoft in 2024.",
  },
];

export const DemoChat: React.FC = () => {
  const [messages, setMessages] = useState<
    Array<{ id: string; role: "user" | "assistant"; text: string; isStreaming?: boolean }>
  >([
    {
      id: "init",
      role: "assistant",
      text: "Hello! Ask me any time-sensitive question about software versions, pricing, or leadership, or pick a scenario above.",
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const simulateTurn = (scenario: ScriptedTurn) => {
    if (isTyping) return;
    setIsTyping(true);

    const userMsgId = `usr_${Date.now()}`;
    const asstMsgId = `ast_${Date.now()}`;

    setMessages((prev) => [
      ...prev,
      { id: userMsgId, role: "user", text: scenario.prompt },
    ]);

    // Streaming typing animation for judge verification
    let currentText = "";
    const fullText = scenario.response;
    let charIndex = 0;

    const timer = setInterval(() => {
      charIndex += 4;
      currentText = fullText.slice(0, charIndex);

      setMessages((prev) => {
        const withoutCurrent = prev.filter((m) => m.id !== asstMsgId);
        return [
          ...withoutCurrent,
          {
            id: asstMsgId,
            role: "assistant",
            text: currentText,
            isStreaming: charIndex < fullText.length,
          },
        ];
      });

      if (charIndex >= fullText.length) {
        clearInterval(timer);
        setIsTyping(false);
      }
    }, 25);
  };

  return (
    <div className="max-w-4xl mx-auto p-4 flex flex-col h-[calc(100vh-140px)]">
      {/* Scenario Bar */}
      <div className="mb-4 bg-zinc-900/80 border border-zinc-800 rounded-lg p-3">
        <div className="text-xs text-zinc-400 font-medium mb-2 flex items-center justify-between">
          <span>⚡ Select a Stale Fact Scenario (Deterministic Demo):</span>
          <span className="text-[10px] text-emerald-400">
            Tagged with data-fl-role="assistant" for FreshLens
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {SCENARIOS.map((s, i) => (
            <button
              key={i}
              onClick={() => simulateTurn(s)}
              disabled={isTyping}
              className="px-2.5 py-1 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700/60 rounded-md transition disabled:opacity-50"
            >
              {s.category.replace("_", " ")}: {s.prompt.slice(0, 32)}...
            </button>
          ))}
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-2">
        {messages.map((m) => {
          if (m.role === "user") {
            return (
              <div key={m.id} className="flex justify-end">
                <div className="max-w-xl bg-zinc-800 text-zinc-100 rounded-2xl px-4 py-2.5 text-sm">
                  {m.text}
                </div>
              </div>
            );
          }

          return (
            <div key={m.id} className="flex justify-start">
              {/* Note: data-fl-role="assistant" is the exact attribute watched by FreshLens DemoAdapter */}
              <div
                data-fl-role="assistant"
                data-fl-id={m.id}
                data-fl-streaming={m.isStreaming ? "true" : "false"}
                className="max-w-2xl bg-zinc-900 border border-zinc-800/80 rounded-2xl p-4 text-sm text-zinc-200 leading-relaxed shadow-sm relative group"
              >
                <div className="flex items-center gap-2 mb-2 pb-1 border-b border-zinc-800/60">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span className="text-xs font-semibold text-zinc-300">
                    Assistant (Mock Frontier Model)
                  </span>
                  {m.isStreaming && (
                    <span className="text-[10px] text-amber-400 animate-pulse">
                      Generating...
                    </span>
                  )}
                </div>
                <p className="whitespace-pre-wrap">{m.text}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Input Bar */}
      <div className="mt-4 pt-2 border-t border-zinc-800/80">
        <div className="flex gap-2">
          <input
            id="fl-demo-input"
            data-fl-input="true"
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && input.trim()) {
                simulateTurn({
                  prompt: input,
                  response: `Regarding "${input}": As of early 2024, Next.js 14 is the latest version and Claude 3.5 Sonnet costs $3/MTok input without prompt caching.`,
                  category: "general",
                  staleNote: "Contains multiple time-sensitive statements.",
                });
                setInput("");
              }
            }}
            placeholder="Type your question or choose a scenario above..."
            className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500/50"
          />
          <button
            onClick={() => {
              if (input.trim()) {
                simulateTurn({
                  prompt: input,
                  response: `Regarding "${input}": Next.js 14 is the latest stable release. Prompt caching is not supported on Claude 3.5 Sonnet.`,
                  category: "general",
                  staleNote: "Demo response with volatile claims.",
                });
                setInput("");
              }
            }}
            className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-sm rounded-lg transition"
          >
            Send
          </button>
        </div>
        <div className="text-[11px] text-zinc-500 mt-2 text-center">
          When the FreshLens extension is active, a floating inspection badge and highlights will appear on completed answers above.
        </div>
      </div>
    </div>
  );
};
