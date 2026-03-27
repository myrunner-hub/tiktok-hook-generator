"use client";

import { useState } from "react";

const toneOptions = ["funny", "dramatic", "educational", "controversial"];

export default function HomePage() {
  const [topic, setTopic] = useState("");
  const [audience, setAudience] = useState("");
  const [tone, setTone] = useState("funny");
  const [hooks, setHooks] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);

  const generateHooks = async () => {
    if (!topic.trim()) {
      setError("Topic is required.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: topic.trim(),
          audience: audience.trim(),
          tone,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate hooks.");
      }

      setHooks(data.hooks || []);
      setCopiedIndex(null);
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const copyHook = async (hook, index) => {
    try {
      await navigator.clipboard.writeText(hook);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 1200);
    } catch (err) {
      setError("Failed to copy hook.");
    }
  };

  return (
    <main className="page">
      <section className="card">
        <h1>Generate Viral TikTok Hooks in Seconds</h1>
        <p className="subtitle">
          Enter your idea and get 10 scroll-stopping hooks instantly.
        </p>

        <div className="form-grid">
          <label className="label">
            Topic <span className="required">*</span>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. side hustles for students"
              className="input"
            />
          </label>

          <label className="label">
            Audience (optional)
            <input
              type="text"
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
              placeholder="e.g. Gen Z creators"
              className="input"
            />
          </label>

          <label className="label">
            Tone
            <select
              value={tone}
              onChange={(e) => setTone(e.target.value)}
              className="input"
            >
              {toneOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="actions">
          <button
            type="button"
            className="button primary"
            onClick={generateHooks}
            disabled={loading}
          >
            {loading ? "Generating..." : "Generate Hooks"}
          </button>
          {hooks.length > 0 && (
            <button
              type="button"
              className="button secondary"
              onClick={generateHooks}
              disabled={loading}
            >
              Regenerate
            </button>
          )}
        </div>

        {error && <p className="error">{error}</p>}

        {hooks.length > 0 && (
          <ol className="hooks-list">
            {hooks.map((hook, index) => (
              <li key={`${hook}-${index}`} className="hook-item">
                <span>{hook}</span>
                <button
                  type="button"
                  className="button copy"
                  onClick={() => copyHook(hook, index)}
                >
                  {copiedIndex === index ? "Copied!" : "Copy"}
                </button>
              </li>
            ))}
          </ol>
        )}
      </section>
    </main>
  );
}
