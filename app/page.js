"use client";

import { useEffect, useState } from "react";

const toneOptions = ["funny", "dramatic", "educational", "controversial"];
const FREE_GENERATION_STORAGE_KEY = "tt_hookgen_used_free_generation";
const IS_DEV = process.env.NODE_ENV !== "production";
const EMAIL_CAPTURE_KEY = "tt_hookgen_email_captured_v1";

const exampleHooks = [
  "I tried this 1-minute trick for hooks and it worked.",
  "Stop using boring intros. Do this instead—right now.",
  "Your niche isn’t the problem. Your hook is."
];

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
  const [hasEmailCaptured, setHasEmailCaptured] = useState(false);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [emailSubmitting, setEmailSubmitting] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [pendingGenerate, setPendingGenerate] = useState(false);

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

      const emailCaptured =
        typeof window !== "undefined" &&
        localStorage.getItem(EMAIL_CAPTURE_KEY) === "true";

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
      setHasEmailCaptured(Boolean(emailCaptured));
    };

    initializeAccess();
  }, []);

  const generateHooksInternal = async () => {
    if (isPaywalled) {
      setError(
        "Your next viral hooks are locked. Unlock limited-time $5 lifetime access."
      );
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

  const generateHooks = async () => {
    if (!hasEmailCaptured) {
      setEmailModalOpen(true);
      setPendingGenerate(true);
      setEmailError("");
      return;
    }

    setPendingGenerate(false);
    await generateHooksInternal();
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
    localStorage.removeItem(EMAIL_CAPTURE_KEY);
    setIsPaywalled(false);
    setHasPaidAccess(false);
    setHooks([]);
    setError("");
    setCopiedIndex(null);
  };

  const validateEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const submitEmail = async () => {
    setEmailError("");
    const email = emailInput.trim();
    if (!email) {
      setEmailError("Email is required (or choose Skip).");
      return;
    }
    if (!validateEmail(email)) {
      setEmailError("Please enter a valid email address.");
      return;
    }

    setEmailSubmitting(true);
    try {
      const response = await fetch("/api/capture-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Unable to save email.");
      }

      localStorage.setItem(EMAIL_CAPTURE_KEY, "true");
      setHasEmailCaptured(true);
      setEmailModalOpen(false);
      setEmailInput("");

      if (pendingGenerate) {
        setPendingGenerate(false);
        await generateHooksInternal();
      }
    } catch (err) {
      setEmailError(err.message || "Unable to submit email.");
    } finally {
      setEmailSubmitting(false);
    }
  };

  const skipEmailCapture = async () => {
    localStorage.setItem(EMAIL_CAPTURE_KEY, "true");
    setHasEmailCaptured(true);
    setEmailModalOpen(false);
    setEmailError("");
    setEmailInput("");

    if (pendingGenerate) {
      setPendingGenerate(false);
      await generateHooksInternal();
    }
  };

  return (
    <main className="page">
      <section className="card">
        <div className="hero">
          <h1 className="hero-title">Steal 10 Viral TikTok Hooks in 5 Seconds</h1>
          <p className="hero-subtitle">
            Type a topic, pick a tone, and get 10 scroll-stopping hooks you can
            copy instantly. Built around viral curiosity, controversy, and story
            psychology.
          </p>

          <div className="trust-row">
            <span className="chip">Viral psychology patterns</span>
            <span className="chip">Creator-tested prompting</span>
            <span className="chip">Under 15 words each</span>
          </div>

          <div className="example-wrap">
            <div className="example-title">Examples (no signup)</div>
            <div className="examples-grid">
              {exampleHooks.map((hook, idx) => (
                <div key={idx} className="example-hook">
                  {hook}
                </div>
              ))}
            </div>
          </div>

          <div className="how-grid">
            <div className="how-step">
              <div className="how-num">1</div>
              <div className="how-text">Enter your topic</div>
            </div>
            <div className="how-step">
              <div className="how-num">2</div>
              <div className="how-text">Choose audience + tone</div>
            </div>
            <div className="how-step">
              <div className="how-num">3</div>
              <div className="how-text">Generate & copy instantly</div>
            </div>
          </div>
        </div>

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

        <p className="cta-small">1 free use • $5 unlimited</p>

        {isPaywalled && (
          <div className="paywall-box">
            <p className="paywall-message">
              Don’t let your next post miss the hook.
              <br />
              Limited-time $5 lifetime access unlocks unlimited generations.
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

      {emailModalOpen && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal">
            <div className="modal-title">Enter your email to get your free viral hooks</div>
            <div className="modal-subtitle">
              We may send more viral hook strategies.
            </div>

            <label className="label" style={{ marginTop: 12 }}>
              Email
              <input
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="you@example.com"
                className="input"
              />
            </label>

            {emailError && <p className="error modal-error">{emailError}</p>}

            <div className="modal-actions">
              <button
                type="button"
                className="button primary"
                onClick={submitEmail}
                disabled={emailSubmitting}
              >
                {emailSubmitting ? "Saving..." : "Send me the free hooks"}
              </button>
              <button
                type="button"
                className="button secondary"
                onClick={skipEmailCapture}
                disabled={emailSubmitting}
              >
                Skip
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
