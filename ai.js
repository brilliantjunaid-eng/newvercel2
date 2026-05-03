"use strict";

/* ═══════════════════════════════════════════════════════
   PACT — AI CONTENT GENERATION (Vercel version)
═══════════════════════════════════════════════════════ */

var AI_CACHE_STORAGE_KEY = "pact.ai_cache";

function getAICache() {
  try {
    var raw = localStorage.getItem(AI_CACHE_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) { return {}; }
}

function setAICache(cacheKey, content) {
  try {
    var cache = getAICache();
    cache[cacheKey] = content;
    localStorage.setItem(AI_CACHE_STORAGE_KEY, JSON.stringify(cache));
  } catch (e) {}
}

function buildAICacheKey(topic, subject) {
  return (subject || "general") + "::" + (topic || "").toLowerCase().trim();
}

function getAICachedContent(topic, subject) {
  return getAICache()[buildAICacheKey(topic, subject)] || null;
}

function isTopicInLibrary(topic) {
  if (!topic || !topic.trim()) return false;
  var norm = topic.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
  return TOPIC_LIBRARY.some(function (entry) {
    return entry.keywords.some(function (kw) {
      var normKw = kw.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
      return norm.indexOf(normKw) >= 0 || normKw.indexOf(norm) >= 0;
    });
  });
}

(function patchLookupContent() {
  var _original = lookupContent;
  lookupContent = function (topic, subject) {
    var cached = getAICachedContent(topic, subject);
    if (cached) return cached;
    return _original(topic, subject);
  };
})();

function generateAIContent(topic, subject, onSuccess, onError) {
  var cached = getAICachedContent(topic, subject);
  if (cached) { onSuccess(cached); return; }

  fetch("/api/generate-hook", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ topic: topic, subject: subject })
  })
  .then(function (res) {
    if (!res.ok) throw new Error("Function returned " + res.status);
    return res.text();
  })
  .then(function (text) {
    var clean  = text.replace(/```json|```/g, "").trim();
    var parsed = JSON.parse(clean);

    if (!Array.isArray(parsed.lowSupport)  || !parsed.lowSupport.length)  parsed.lowSupport  = ["Stay with the next single step.", "One move at a time is enough right now."];
    if (!Array.isArray(parsed.midSupport)  || !parsed.midSupport.length)  parsed.midSupport  = ["Ask what the core idea really is.", "Name the central question in plain words first."];
    if (!Array.isArray(parsed.highSupport) || !parsed.highSupport.length) parsed.highSupport = ["You are in a good state. Keep going.", "Stay quiet and let the work carry you."];

    setAICache(buildAICacheKey(topic, subject), parsed);
    onSuccess(parsed);
  })
  .catch(function (err) {
    console.error("[Pact AI] Generation failed:", err);
    if (onError) onError(err);
  });
}

/* ═══════════════════════════════════════════════════════
   MCQ SEQUENCE — three-slide reveal before the hook page
═══════════════════════════════════════════════════════ */

function injectMCQStyles() {
  if (document.getElementById("pact-mcq-styles")) return;
  var style = document.createElement("style");
  style.id = "pact-mcq-styles";
  style.textContent = [
    /* overlay */
    "#pact-mcq-overlay {",
    "  position: fixed; inset: 0; z-index: 200;",
    "  background: radial-gradient(circle at top left, rgba(213,141,123,0.12), transparent 28%),",
    "              radial-gradient(circle at top right, rgba(220,232,243,0.22), transparent 30%),",
    "              linear-gradient(180deg, #fcf8f3 0%, #f8f3ec 100%);",
    "  display: flex; flex-direction: column;",
    "  overflow: hidden;",
    "}",

    /* progress strip */
    "#pact-mcq-progress {",
    "  height: 2px; background: var(--border);",
    "  flex-shrink: 0;",
    "}",
    "#pact-mcq-progress-fill {",
    "  height: 100%; background: var(--accent);",
    "  transition: width 0.5s cubic-bezier(0.4,0,0.2,1);",
    "  width: 33.33%;",
    "}",

    /* slide viewport */
    "#pact-mcq-viewport {",
    "  flex: 1; position: relative; overflow: hidden;",
    "}",

    /* individual slides */
    ".pact-mcq-slide {",
    "  position: absolute; inset: 0;",
    "  display: flex; align-items: center; justify-content: center;",
    "  padding: 2rem 1.5rem; overflow-y: auto;",
    "  opacity: 0; transform: translateY(18px);",
    "  pointer-events: none;",
    "  transition: opacity 0.45s cubic-bezier(0.4,0,0.2,1), transform 0.45s cubic-bezier(0.4,0,0.2,1);",
    "}",
    ".pact-mcq-slide.mcq-active {",
    "  opacity: 1; transform: translateY(0); pointer-events: all;",
    "}",
    ".pact-mcq-slide.mcq-exit {",
    "  opacity: 0; transform: translateY(-14px); pointer-events: none;",
    "}",

    /* slide inner */
    ".pact-mcq-inner {",
    "  width: min(560px, 100%);",
    "  padding-bottom: 2rem;",
    "}",

    /* step label row */
    ".mcq-step-row {",
    "  display: flex; align-items: center; gap: 0.6rem;",
    "  margin-bottom: 2rem;",
    "}",
    ".mcq-dots { display: flex; gap: 5px; }",
    ".mcq-dot {",
    "  width: 5px; height: 5px; border-radius: 50%;",
    "  background: var(--border);",
    "  transition: background 0.3s;",
    "}",
    ".mcq-dot.mcq-dot-done  { background: var(--accent); }",
    ".mcq-dot.mcq-dot-now   { background: var(--text); }",
    ".mcq-step-label {",
    "  font-size: 0.7rem; letter-spacing: 0.1em;",
    "  text-transform: uppercase; color: var(--muted);",
    "}",

    /* question tag pill */
    ".mcq-tag {",
    "  display: inline-block;",
    "  background: var(--amber); color: var(--text);",
    "  font-size: 0.72rem; letter-spacing: 0.08em;",
    "  text-transform: uppercase; padding: 0.3rem 0.8rem;",
    "  border-radius: 999px; margin-bottom: 1.4rem;",
    "  border: 1px solid rgba(92,78,68,0.15);",
    "}",

    /* question text */
    ".mcq-question {",
    "  font-family: var(--font-serif);",
    "  font-size: clamp(1.4rem, 4vw, 1.95rem);",
    "  line-height: 1.35; font-weight: 700;",
    "  letter-spacing: -0.02em;",
    "  color: var(--text); margin-bottom: 1.75rem;",
    "}",

    /* options list */
    ".mcq-options { display: flex; flex-direction: column; gap: 0.6rem; margin-bottom: 1.25rem; }",
    ".mcq-option {",
    "  display: flex; align-items: center; gap: 0.85rem;",
    "  padding: 0.9rem 1.1rem;",
    "  border: 1px solid var(--border);",
    "  border-radius: var(--radius-md);",
    "  background: var(--surface-strong);",
    "  font-family: var(--font-sans); font-size: 0.95rem;",
    "  color: var(--muted); text-align: left; width: 100%;",
    "  cursor: pointer;",
    "  transition: border-color 0.18s, background 0.18s, transform 0.15s, color 0.18s;",
    "}",
    ".mcq-option:hover:not(:disabled) {",
    "  border-color: var(--border-strong);",
    "  background: rgba(255,255,255,0.98);",
    "  transform: translateX(3px); color: var(--text);",
    "}",
    ".mcq-letter {",
    "  width: 26px; height: 26px; border-radius: 50%;",
    "  background: rgba(92,78,68,0.07);",
    "  border: 1px solid var(--border);",
    "  display: flex; align-items: center; justify-content: center;",
    "  font-size: 0.72rem; font-weight: 600; flex-shrink: 0;",
    "  color: var(--muted);",
    "  transition: background 0.18s, border-color 0.18s, color 0.18s;",
    "}",

    /* option states */
    ".mcq-option.mcq-wrong  { border-color: rgba(185,60,60,0.35); background: rgba(253,235,235,0.9); color: var(--text); }",
    ".mcq-option.mcq-wrong .mcq-letter  { background: #b93c3c; border-color: #b93c3c; color: #fff; }",
    ".mcq-option.mcq-correct { border-color: rgba(53,92,86,0.4); background: rgba(220,233,226,0.8); color: var(--text); }",
    ".mcq-option.mcq-correct .mcq-letter { background: var(--accent); border-color: var(--accent); color: #fff; }",
    ".mcq-option.mcq-reveal  { border-color: rgba(53,92,86,0.25); background: rgba(220,233,226,0.45); opacity: 0.65; }",
    ".mcq-option:disabled    { cursor: default; transform: none; }",

    /* feedback */
    ".mcq-feedback {",
    "  padding: 0.9rem 1.1rem; border-radius: var(--radius-sm);",
    "  font-size: 0.9rem; line-height: 1.65;",
    "  opacity: 0; transform: translateY(5px);",
    "  transition: opacity 0.3s, transform 0.3s;",
    "  margin-bottom: 1rem;",
    "}",
    ".mcq-feedback.mcq-feedback-visible { opacity: 1; transform: translateY(0); }",
    ".mcq-feedback.mcq-fb-wrong  { background: rgba(253,235,235,0.9); border: 1px solid rgba(185,60,60,0.18); color: #8b2e2e; }",
    ".mcq-feedback.mcq-fb-correct { background: rgba(220,233,226,0.8); border: 1px solid rgba(53,92,86,0.2); color: var(--accent-deep); }",
    ".mcq-fb-label { font-size: 0.7rem; letter-spacing: 0.08em; text-transform: uppercase; font-weight: 600; margin-bottom: 0.35rem; }",

    /* next button */
    ".mcq-next {",
    "  display: inline-flex; align-items: center; gap: 0.5rem;",
    "  padding: 0.78rem 1.5rem;",
    "  background: linear-gradient(135deg, var(--accent) 0%, var(--accent-deep) 100%);",
    "  color: #fffdf8; border: none; border-radius: 999px;",
    "  font-family: var(--font-sans); font-size: 0.875rem;",
    "  box-shadow: 0 10px 24px rgba(36,65,61,0.18);",
    "  cursor: pointer;",
    "  opacity: 0; pointer-events: none; transform: translateY(5px);",
    "  transition: opacity 0.3s 0.1s, transform 0.3s 0.1s, background 0.18s;",
    "}",
    ".mcq-next.mcq-next-visible { opacity: 1; pointer-events: all; transform: translateY(0); }",
    ".mcq-next:hover { background: linear-gradient(135deg, var(--accent-deep) 0%, #1a3330 100%); }",
    ".mcq-next-arrow { transition: transform 0.18s; }",
    ".mcq-next:hover .mcq-next-arrow { transform: translateX(3px); }",

    /* slide 2 correction styles */
    ".mcq-actually {",
    "  font-family: var(--font-serif); font-style: italic;",
    "  color: var(--rose); font-size: 1rem; margin-bottom: 1rem;",
    "}",
    ".mcq-correction-headline {",
    "  font-family: var(--font-serif);",
    "  font-size: clamp(1.5rem, 4vw, 2.1rem);",
    "  font-weight: 700; letter-spacing: -0.03em;",
    "  line-height: 1.25; color: var(--text); margin-bottom: 1.25rem;",
    "}",
    ".mcq-correction-body {",
    "  font-size: 1rem; color: var(--muted);",
    "  line-height: 1.8;",
    "  border-left: 2px solid var(--border-strong);",
    "  padding-left: 1.1rem; margin-bottom: 1.25rem;",
    "}",
    ".mcq-correction-note {",
    "  font-size: 0.875rem; color: var(--muted); line-height: 1.65;",
    "  background: rgba(255,250,246,0.8);",
    "  padding: 0.85rem 1rem; border-radius: var(--radius-sm);",
    "  border: 1px solid var(--border); margin-bottom: 1.5rem;",
    "}",

    /* staggered child entrance */
    ".mcq-active .pact-mcq-inner > * { animation: mcqChildIn 0.45s both; }",
    ".mcq-active .pact-mcq-inner > *:nth-child(1) { animation-delay: 0.04s; }",
    ".mcq-active .pact-mcq-inner > *:nth-child(2) { animation-delay: 0.09s; }",
    ".mcq-active .pact-mcq-inner > *:nth-child(3) { animation-delay: 0.14s; }",
    ".mcq-active .pact-mcq-inner > *:nth-child(4) { animation-delay: 0.19s; }",
    ".mcq-active .pact-mcq-inner > *:nth-child(5) { animation-delay: 0.24s; }",
    ".mcq-active .pact-mcq-inner > *:nth-child(6) { animation-delay: 0.29s; }",
    "@keyframes mcqChildIn {",
    "  from { opacity: 0; transform: translateY(10px); }",
    "  to   { opacity: 1; transform: translateY(0); }",
    "}"
  ].join("\n");
  document.head.appendChild(style);
}

/* Build and inject the overlay DOM */
function buildMCQOverlay(aiContent, onComplete) {
  injectMCQStyles();

  var mcq = aiContent.mcq || {};
  var question = mcq.question || aiContent.hook || "What do you already know about this topic?";
  var options  = mcq.options  || [
    { letter: "A", text: "I have a solid foundation here",        correct: false },
    { letter: "B", text: "I know the name, not much else",        correct: false },
    { letter: "C", text: "I have some ideas but I'm not certain", correct: true  },
    { letter: "D", text: "This is completely new to me",          correct: false }
  ];
  var wrongFeedback   = mcq.wrongFeedback   || "That's the instinct most people follow — and it almost works. But there's a wrinkle that changes everything.";
  var correctFeedback = mcq.correctFeedback || "Right — though the more surprising part is still ahead.";
  var hookText        = aiContent.hook      || "";
  var hookLong        = aiContent.hookLong  || "";
  var title           = aiContent.title     || "";

  /* ── overlay shell ── */
  var overlay = document.createElement("div");
  overlay.id = "pact-mcq-overlay";

  /* progress bar */
  overlay.innerHTML = [
    '<div id="pact-mcq-progress"><div id="pact-mcq-progress-fill"></div></div>',
    '<div id="pact-mcq-viewport">',

    /* SLIDE 1 — question */
    '<div class="pact-mcq-slide mcq-active" id="mcq-slide-1">',
    '  <div class="pact-mcq-inner">',
    '    <div class="mcq-step-row">',
    '      <div class="mcq-dots">',
    '        <div class="mcq-dot mcq-dot-now"  id="mcq-d1"></div>',
    '        <div class="mcq-dot"               id="mcq-d2"></div>',
    '        <div class="mcq-dot"               id="mcq-d3"></div>',
    '      </div>',
    '      <span class="mcq-step-label">before the chapter begins</span>',
    '    </div>',
    '    <span class="mcq-tag">' + escHtml(title || "Quick question") + '</span>',
    '    <p class="mcq-question" id="mcq-q-text">' + escHtml(question) + '</p>',
    '    <div class="mcq-options" id="mcq-options"></div>',
    '    <div class="mcq-feedback" id="mcq-feedback">',
    '      <div class="mcq-fb-label" id="mcq-fb-label"></div>',
    '      <div id="mcq-fb-text"></div>',
    '    </div>',
    '    <button class="mcq-next" id="mcq-next-1" type="button">',
    '      See why <span class="mcq-next-arrow">→</span>',
    '    </button>',
    '  </div>',
    '</div>',

    /* SLIDE 2 — correction */
    '<div class="pact-mcq-slide" id="mcq-slide-2">',
    '  <div class="pact-mcq-inner">',
    '    <div class="mcq-step-row">',
    '      <div class="mcq-dots">',
    '        <div class="mcq-dot mcq-dot-done"></div>',
    '        <div class="mcq-dot mcq-dot-now"></div>',
    '        <div class="mcq-dot"></div>',
    '      </div>',
    '      <span class="mcq-step-label">the correction</span>',
    '    </div>',
    '    <p class="mcq-actually">Actually\u2026</p>',
    '    <h2 class="mcq-correction-headline" id="mcq-correction-hl">' + escHtml(hookText) + '</h2>',
    '    <p class="mcq-correction-body" id="mcq-correction-body">' + escHtml(hookLong) + '</p>',
    '    <p class="mcq-correction-note" id="mcq-correction-note">This is the idea that will make the chapter make sense. Carry it in.</p>',
    '    <button class="mcq-next mcq-next-visible" id="mcq-next-2" type="button">',
    '      Now open the chapter <span class="mcq-next-arrow">→</span>',
    '    </button>',
    '  </div>',
    '</div>',

    '</div>' /* viewport */
  ].join("");

  document.body.appendChild(overlay);

  /* ── render options ── */
  var optContainer = document.getElementById("mcq-options");
  options.forEach(function (opt) {
    var btn = document.createElement("button");
    btn.className = "mcq-option";
    btn.type = "button";
    btn.dataset.correct = String(opt.correct);
    btn.innerHTML = '<span class="mcq-letter">' + escHtml(opt.letter) + '</span><span>' + escHtml(opt.text) + '</span>';
    btn.addEventListener("click", function () { handleMCQAnswer(btn, opt.correct, wrongFeedback, correctFeedback); });
    optContainer.appendChild(btn);
  });

  /* ── slide 1 next ── */
  document.getElementById("mcq-next-1").addEventListener("click", function () {
    goMCQSlide(1, 2);
  });

  /* ── slide 2 next → dismiss overlay and reveal hook ── */
  document.getElementById("mcq-next-2").addEventListener("click", function () {
    dismissMCQOverlay(overlay, onComplete);
  });
}

var mcqAnswered = false;

function handleMCQAnswer(btn, isCorrect, wrongFeedback, correctFeedback) {
  if (mcqAnswered) return;
  mcqAnswered = true;

  var allBtns = document.querySelectorAll(".mcq-option");
  allBtns.forEach(function (b) {
    b.disabled = true;
    if (b.dataset.correct === "true" && b !== btn) {
      b.classList.add("mcq-reveal");
    }
  });

  var feedback  = document.getElementById("mcq-feedback");
  var fbLabel   = document.getElementById("mcq-fb-label");
  var fbText    = document.getElementById("mcq-fb-text");
  var nextBtn   = document.getElementById("mcq-next-1");

  if (isCorrect) {
    btn.classList.add("mcq-correct");
    feedback.classList.add("mcq-fb-correct");
    fbLabel.textContent = "You got it";
    fbText.textContent  = correctFeedback;
  } else {
    btn.classList.add("mcq-wrong");
    feedback.classList.add("mcq-fb-wrong");
    fbLabel.textContent = "Not quite";
    fbText.textContent  = wrongFeedback;
  }

  /* stagger: feedback first, then button */
  setTimeout(function () {
    feedback.classList.add("mcq-feedback-visible");
    setTimeout(function () {
      nextBtn.classList.add("mcq-next-visible");
    }, 280);
  }, 120);
}

function goMCQSlide(from, to) {
  var fromEl = document.getElementById("mcq-slide-" + from);
  var toEl   = document.getElementById("mcq-slide-" + to);
  var fill   = document.getElementById("pact-mcq-progress-fill");

  fromEl.classList.add("mcq-exit");
  setTimeout(function () {
    fromEl.classList.remove("mcq-active", "mcq-exit");
    toEl.classList.add("mcq-active");
    fill.style.width = (to / 3 * 100) + "%";
  }, 320);
}

function dismissMCQOverlay(overlay, onComplete) {
  overlay.style.transition = "opacity 0.45s ease";
  overlay.style.opacity    = "0";
  setTimeout(function () {
    if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    if (onComplete) onComplete();
  }, 450);
}

function escHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/* ═══════════════════════════════════════════════════════
   MAIN HOOK PAGE ENHANCEMENT
═══════════════════════════════════════════════════════ */

function enhanceHookPageWithAI(els, context, state, fallbackContent) {
  var topic   = context.topic;
  var subject = context.subject;

  if (isTopicInLibrary(topic)) return;

  /* show loading state in the hook layout while AI generates */
  els.title.textContent            = "Finding what makes " + topic + " worth approaching\u2026";
  els.shortText.textContent        = "One moment while the warm-up takes shape.";
  els.longText.textContent         = "";
  els.beautyText.textContent       = "Preparing a curiosity angle for this topic\u2026";
  els.lensText.textContent         = "";
  els.payoffText.textContent       = "";
  els.challengePreview.textContent = "The challenge question is being prepared\u2026";

  /* hide the hook layout until the MCQ sequence is complete */
  var hookLayout = document.querySelector(".hook-layout");
  if (hookLayout) hookLayout.style.visibility = "hidden";

  var cached = getAICachedContent(topic, subject);

  if (cached) {
    launchMCQThenHook(els, cached);
    return;
  }

  generateAIContent(topic, subject,
    function (aiContent) {
      launchMCQThenHook(els, aiContent);
    },
    function () {
      /* on error: skip MCQ, just show the fallback hook */
      if (hookLayout) hookLayout.style.visibility = "";
      applyAIContentToHook(els, fallbackContent);
    }
  );
}

/*
  Once AI content is ready:
  1. Apply it to the (hidden) hook layout
  2. Show the MCQ overlay
  3. On MCQ completion, reveal the hook layout
*/
function launchMCQThenHook(els, aiContent) {
  /* pre-populate the hook layout while it's still hidden */
  applyAIContentToHook(els, aiContent);

  mcqAnswered = false; /* reset in case of re-entry */

  buildMCQOverlay(aiContent, function onComplete() {
    var hookLayout = document.querySelector(".hook-layout");
    if (hookLayout) {
      hookLayout.style.visibility = "";
      /* gentle entrance */
      hookLayout.style.opacity    = "0";
      hookLayout.style.transition = "opacity 0.5s ease";
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          hookLayout.style.opacity = "1";
        });
      });
    }
  });
}

function applyAIContentToHook(els, content) {
  if (!content) return;
  if (els.title)            els.title.textContent            = content.title         || "";
  if (els.shortText)        els.shortText.textContent        = content.hook          || "";
  if (els.longText)         els.longText.textContent         = content.hookLong      || "";
  if (els.beautyText)       els.beautyText.textContent       = content.beauty        || "";
  if (els.lensText)         els.lensText.textContent         = content.lens          || "";
  if (els.payoffText)       els.payoffText.textContent       = content.payoff        || "";
  if (els.visualTitle)      els.visualTitle.textContent      = content.visualTitle   || "";
  if (els.visualCaption)    els.visualCaption.textContent    = content.visualCaption || "";
  if (els.visualGraphic)    els.visualGraphic.innerHTML      = renderTopicVisual(content);
  if (els.challengePreview) els.challengePreview.textContent = (content.challenge && content.challenge.question) || "";
}
