// api/generate-hook.js
// ─────────────────────────────────────────────────────────
// Vercel Serverless Function using Groq API
// ─────────────────────────────────────────────────────────

export default async function handler(req, res) {

  if (req.method !== "POST") {
    return res.status(405).send("Method not allowed");
  }

  var topic   = (req.body.topic   || "").trim();
  var subject = (req.body.subject || "general").trim();

  if (!topic) {
    return res.status(400).send("Topic is required");
  }

var prompt = [
  "A student is about to study \"" + topic + "\" in " + subject + ".",
  "",
  "Before writing anything, think: what is the single most surprising or counterintuitive thing about this topic?",
  "What would make a smart person say 'wait, I never thought about it that way'?",
  "That insight must drive the hook — not a definition, not a summary.",
  "The MCQ question must grow from that same core surprise.",
  "",
  "Rules:",
  "- hook: one sentence, under 20 words. Must contain a specific surprising fact or contradiction. NOT a vague claim.",
  "- hookLong: 2-3 sentences. Expand the surprise. Use a concrete analogy or real-world connection. No textbook tone.",
  "- beauty: must be a specific observation, not a label. Don't say 'elegant' or 'complex'. Say what specifically surprises you.",
  "- lens: one specific thing to notice while studying — a pattern, a question, an irony.",
  "- payoff: a real-world consequence of understanding this. Not 'it will help you in exams'.",
  "- lowSupport/midSupport/highSupport: short emotional nudges, 1 sentence each, specific to the feeling of studying THIS topic. NOT study instructions or task suggestions.",
  "- challenge.question: a question that cannot be answered by memorization alone.",
  "- mcq.question: the exact same surprise that drives the hook, phrased as a direct question. Under 20 words. Should feel genuinely uncertain — not a trick question with an obvious answer.",
  "- mcq.options: exactly 4 options (A, B, C, D). Exactly one must have correct: true. Wrong options must be plausible misconceptions — a student who hasn't studied this should reasonably pick one of them.",
  "- mcq.wrongFeedback: 1-2 sentences max. Do NOT explain the answer. Validate the instinct behind the wrong choice, then create the gap: 'that's what most people think — watch what happens when you push further.'",
  "- mcq.correctFeedback: 1-2 sentences. Affirm the answer, but signal that the more surprising part is still ahead.",
  "- All historical facts, numbers, dates and figures must be accurate. If uncertain, describe qualitatively instead of inventing a number.",
  "",
  "Banned words: fascinating, intriguing, delve, explore, beautiful, complex, unlock, elegant, it is worth noting, crushing it, whole new world, next level, hard work is paying off, payoff is huge.",
  "",
  "BAD hook: 'Atoms can be counted precisely using the mole concept.'",
  "GOOD hook: 'One mole of sand grains would bury every continent on Earth under 1 kilometre of sand — yet chemists count in moles daily.'",
  "",
  "BAD mcq wrongFeedback: 'Actually, the answer is B because...' (never explain the answer in wrongFeedback)",
  "GOOD mcq wrongFeedback: 'That's the instinct most people follow — and it almost works. But there's a wrinkle that changes everything.'",
  "",
  "BAD beauty: 'Elegant administrative systems'",
  "GOOD beauty: 'An empire spanning 150 million people ran on handwritten letters and personal loyalty.'",
  "",
  "BAD support: 'Start by reading a brief overview' or 'Watch a documentary'",
  "GOOD support: 'Every empire you study is secretly a story about one person trying to hold everything together.'",
  "",
  "Respond with ONLY valid JSON. No markdown. No commentary. No fences.",
  "",
  "{",
  "  \"title\": \"3-5 word topic name\",",
  "  \"hook\": \"...\",",
  "  \"hookLong\": \"...\",",
  "  \"beauty\": \"...\",",
  "  \"lens\": \"...\",",
  "  \"payoff\": \"...\",",
  "  \"visualKind\": \"timeline|flowchart|hierarchy|cycle|comparison\",",
  "  \"visualTitle\": \"5-7 word title\",",
  "  \"visualCaption\": \"one sentence\",",
  "  \"visual\": \"<SVG_HERE>\",",
  "  \"lowSupport\": [\"...\", \"...\"],",
  "  \"midSupport\": [\"...\", \"...\"],",
  "  \"highSupport\": [\"...\", \"...\"],",
  "  \"challenge\": { \"question\": \"...\", \"cues\": \"...\" },",
  "  \"mcq\": {",
  "    \"question\": \"...\",",
  "    \"options\": [",
  "      { \"letter\": \"A\", \"text\": \"...\", \"correct\": false },",
  "      { \"letter\": \"B\", \"text\": \"...\", \"correct\": false },",
  "      { \"letter\": \"C\", \"text\": \"...\", \"correct\": true },",
  "      { \"letter\": \"D\", \"text\": \"...\", \"correct\": false }",
  "    ],",
  "    \"wrongFeedback\": \"...\",",
  "    \"correctFeedback\": \"...\"",
  "  }",
  "}",
  "",
  "For the visual field, generate a clean SVG schematic (500x280) specific to this topic.",
  "Use these colors only: background #f2f8f5, lines/shapes #355c56, text #2d2a29, accent #d58d7b.",
  "No images, no clipPath, no foreignObject. Only rect, circle, line, path, text, g elements.",
  "Style: minimal, schematic, labeled. Like a hand-drawn diagram, not a chart.",
  "For history topics: draw a horizontal timeline with 4-5 key events as labeled dots.",
  "For science topics: draw a labeled process flow or cycle with arrows.",
  "For math topics: draw an annotated curve or geometric diagram.",
  "For concepts/people: draw a cause-effect chain or comparison grid.",
  "Every node or point must have a short text label directly on the SVG.",
  "The SVG must be a single line with no line breaks inside the string value."
].join("\n");

  var response;
  try {
    response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + process.env.GROQ_API_KEY
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        max_tokens: 2400,
        messages: [{ role: "user", content: prompt }]
      })
    });
  } catch (e) {
    console.error("Groq fetch failed:", e);
    return res.status(502).send("Upstream API error");
  }

  var data;
  try {
    data = await response.json();
  } catch (e) {
    return res.status(502).send("Invalid upstream response");
  }

  if (!data.choices || !data.choices[0] || !data.choices[0].message) {
    console.error("Unexpected Groq response:", JSON.stringify(data));
    return res.status(502).json({ error: "Unexpected response", detail: data });
  }

  var text  = data.choices[0].message.content;
  var clean = text.replace(/```json|```/g, "").trim();

  res.status(200).setHeader("Content-Type", "application/json").send(clean);
}
