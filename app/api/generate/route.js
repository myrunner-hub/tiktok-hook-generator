import { NextResponse } from "next/server";

const SYSTEM_PROMPT = `You are a viral TikTok content expert.

Generate 10 highly engaging TikTok hooks based on the user's topic.

Rules:
- Each hook must be under 15 words
- Use curiosity, shock, controversy, or emotional triggers
- Avoid generic phrasing
- Make each hook feel like it would stop scrolling instantly

Return as a numbered list.`;

const MAX_WORDS = 15;
const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
const FALLBACK_MODELS = [
  "llama-3.3-70b-versatile",
  "llama-3.1-8b-instant",
  "mixtral-8x7b-32768",
];
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 8;

const ipRequestStore = globalThis.__ipRequestStore || new Map();
globalThis.__ipRequestStore = ipRequestStore;

function parseHooks(content) {
  return content
    .split("\n")
    .map((line) => line.replace(/^\s*\d+[\).\-\s]*/, "").trim())
    .filter(Boolean)
    .map((line) => line.replace(/^["']|["']$/g, ""))
    .filter((line) => line.split(/\s+/).length <= MAX_WORDS)
    .slice(0, 10);
}

function getClientIp(request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  return request.headers.get("x-real-ip") || "unknown";
}

function isRateLimited(ip) {
  const now = Date.now();
  const timestamps = ipRequestStore.get(ip) || [];
  const recentTimestamps = timestamps.filter(
    (timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS
  );

  if (recentTimestamps.length >= RATE_LIMIT_MAX_REQUESTS) {
    ipRequestStore.set(ip, recentTimestamps);
    return true;
  }

  recentTimestamps.push(now);
  ipRequestStore.set(ip, recentTimestamps);
  return false;
}

function isModelUnavailable(errorPayloadText, errorPayloadJson) {
  const errorCode = errorPayloadJson?.error?.code || "";
  const errorMessage = errorPayloadJson?.error?.message || errorPayloadText;
  const normalizedMessage = String(errorMessage).toLowerCase();

  return (
    errorCode === "model_decommissioned" ||
    normalizedMessage.includes("decommissioned") ||
    normalizedMessage.includes("model") && normalizedMessage.includes("not found")
  );
}

async function generateWithFallback(userPrompt) {
  const modelsToTry = [GROQ_MODEL, ...FALLBACK_MODELS].filter(
    (value, index, array) => value && array.indexOf(value) === index
  );

  let lastError = null;

  for (const model of modelsToTry) {
    const completion = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model,
          temperature: 0.9,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userPrompt },
          ],
        }),
      }
    );

    if (completion.ok) {
      const data = await completion.json();
      return { data, model };
    }

    const errorText = await completion.text();
    let errorJson = null;
    try {
      errorJson = JSON.parse(errorText);
    } catch {
      errorJson = null;
    }

    lastError = {
      status: completion.status,
      message: errorText,
      model,
    };

    if (!isModelUnavailable(errorText, errorJson)) {
      break;
    }
  }

  throw lastError || { status: 502, message: "Unknown Groq API error." };
}

export async function POST(request) {
  try {
    const { topic, audience, tone } = await request.json();

    if (!topic || !topic.trim()) {
      return NextResponse.json(
        { error: "Topic is required." },
        { status: 400 }
      );
    }

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json(
        { error: "Missing GROQ_API_KEY environment variable." },
        { status: 500 }
      );
    }

    const clientIp = getClientIp(request);
    if (isRateLimited(clientIp)) {
      return NextResponse.json(
        { error: "Too many requests. Please wait a minute and try again." },
        { status: 429 }
      );
    }

    const userPrompt = [
      `Topic: ${topic.trim()}`,
      audience?.trim() ? `Audience: ${audience.trim()}` : null,
      tone?.trim() ? `Tone: ${tone.trim()}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    let data;
    try {
      const result = await generateWithFallback(userPrompt);
      data = result.data;
    } catch (apiError) {
      return NextResponse.json(
        { error: `Groq request failed: ${apiError.message}` },
        { status: apiError.status || 502 }
      );
    }
    const content = data?.choices?.[0]?.message?.content || "";
    const hooks = parseHooks(content);

    if (!hooks.length) {
      return NextResponse.json(
        { error: "No hooks were generated. Try adjusting your input." },
        { status: 502 }
      );
    }

    return NextResponse.json({ hooks: hooks.slice(0, 10) });
  } catch {
    return NextResponse.json(
      { error: "Unexpected error while generating hooks." },
      { status: 500 }
    );
  }
}
