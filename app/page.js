"use client";

import { useEffect, useState } from "react";

const toneOptions = ["funny", "dramatic", "educational", "controversial"];
const FREE_GENERATION_STORAGE_KEY = "tt_hookgen_used_free_generation";
const IS_DEV = process.env.NODE_ENV !== "production";

export default function HomePage() {
  const [topic, setTopic] = useState("");
  const [audience, setAudience] = useState("");
  const [tone, setTone] = useState("funny");
  const [hooks, setHooks] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [upgradeLoading, setUpgradeLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [isPaywalled, setIsPaywalled] = useState(false);
  const [hasPaidAccess, setHasPaidAccess] = useState(false);

  useEffect(() => {
    const initializeAccess = async () => {
      const hasUsedFreeGeneration =
        typeof window !== "undefined" &&
        localStorage.getItem(FREE_GENERATION_STORAGE_KEY) === "true";
      let paidAccess = false;

      try {
        const statusResponse = await fetch("/api/paid-status");
        const statusData = await statusResponse.json();
        paidAccess = Boolean(statusData?.paid);
      } catch {
        paidAccess = false;
      }

      const params = new URLSearchParams(window.location.search);
      const isUpgraded = params.get("upgraded") === "true";
      const sessionId = params.get("session_id");

      if (isUpgraded && sessionId) {
        try {
          const verifyResponse = await fetch("/api/verify-checkout-session", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sessionId }),
          });
          const verifyData = await verifyResponse.json();
          if (!verifyResponse.ok || !verifyData?.paid) {
            throw new Error(verifyData.error || "Failed to verify payment.");
          }
          paidAccess = true;
          setError("");
        } catch (err) {
          setError(err.message || "Unable to verify upgrade.");
        } finally {
          window.history.replaceState({}, "", window.location.pathname);
        }
      }

      setHasPaidAccess(paidAccess);
      setIsPaywalled(hasUsedFreeGeneration && !paidAccess);
    };

    initializeAccess();
  }, []);

  const generateHooks = async () => {
    if (isPaywalled) {
      setError("You've used your free generation. Unlock unlimited hooks for $5");
      return;
    }

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
      if (!hasPaidAccess) {
        localStorage.setItem(FREE_GENERATION_STORAGE_KEY, "true");
        setIsPaywalled(true);
      }
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

  const onUpgradeClick = async () => {
    setError("");
    setUpgradeLoading(true);
    try {
      const response = await fetch("/api/create-checkout-session", {
        method: "POST",
      });
      const data = await response.json();
      if (!response.ok || !data?.url) {
        throw new Error(data.error || "Failed to start checkout.");
      }
      window.location.href = data.url;
    } catch (err) {
      setError(err.message || "Unable to open checkout.");
    } finally {
      setUpgradeLoading(false);
    }
  };

  const resetFreeTrial = async () => {
    localStorage.removeItem(FREE_GENERATION_STORAGE_KEY);
    await fetch("/api/clear-paid-access", { method: "POST" });
    setIsPaywalled(false);
    setHasPaidAccess(false);
    setHooks([]);
    setError("");
    setCopiedIndex(null);
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
            disabled={loading || isPaywalled}
          >
            {loading ? "Generating..." : "Generate Hooks"}
          </button>
          {hooks.length > 0 && (
            <button
              type="button"
              className="button secondary"
              onClick={generateHooks}
              disabled={loading || isPaywalled}
            >
              Regenerate
            </button>
          )}
        </div>

        {isPaywalled && (
          <div className="paywall-box">
            <p className="paywall-message">
              You've used your free generation. Unlock unlimited hooks for $5
            </p>
            <button
              type="button"
              className="button upgrade"
              onClick={onUpgradeClick}
              disabled={upgradeLoading}
            >
              {upgradeLoading ? "Redirecting..." : "Upgrade"}
            </button>
          </div>
        )}

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

        {IS_DEV && (
          <div className="actions">
            <button type="button" className="button secondary" onClick={resetFreeTrial}>
              Reset Free Trial (Dev)
            </button>
          </div>
        )}
      </section>
    </main>
  );
}
