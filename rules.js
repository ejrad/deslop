// rules.js — AI detection scoring engine (pure JS, no API required)

const PHRASE_RULES = [
  // Explicit AI disclosure — very high weight
  { pattern: /\bi (asked|used|tried|had|got) (chatgpt|claude|gpt|openai|gemini|copilot|an? ai|ai tools?)\b/i, weight: 50, label: "Explicit AI use" },
  { pattern: /\b(generated|written|created|drafted|produced) (with|by|using) (ai|chatgpt|claude|gpt|gemini|copilot)\b/i, weight: 50, label: "Explicit AI use" },
  { pattern: /\bprompt:/i, weight: 45, label: "Prompt disclosed" },
  { pattern: /\bai.generated\b/i, weight: 50, label: "AI-generated label" },

  // Strong LinkedIn AI openers
  { pattern: /\bin today'?s? (fast.?paced|rapidly evolving|ever.?changing|digital|competitive) (world|landscape|era|age|environment)\b/i, weight: 28, label: "AI filler opener" },
  { pattern: /\bi'?m (thrilled|excited|humbled|honored|delighted|proud|beyond excited) to (announce|share|introduce|reveal|present)\b/i, weight: 22, label: "Sycophantic opener" },
  { pattern: /\b(big|exciting|incredible|major|huge) (news|announcement|update|milestone|moment)\b/i, weight: 15, label: "Hype announcement" },
  { pattern: /\bthis changed (everything|my life|the way i|how i)\b/i, weight: 22, label: "AI dramatic phrase" },
  { pattern: /\bit'?s not (just )?about .{5,60}, it'?s about\b/i, weight: 18, label: "AI contrast pattern" },

  // AI transition / structure phrases
  { pattern: /\blet'?s (unpack|break (this|it) down|dive in|explore this)\b/i, weight: 18, label: "AI transition phrase" },
  { pattern: /\bdeep.?dive\b/i, weight: 12, label: "AI phrase" },
  { pattern: /\bhere'?s? (what|the|my) (i learned|truth|secret|key|takeaway)\b/i, weight: 18, label: "AI hook phrase" },
  { pattern: /\bthe (truth|secret|key|reality) is\b/i, weight: 15, label: "AI reveal hook" },
  { pattern: /\bat the end of the day\b/i, weight: 12, label: "AI filler" },
  { pattern: /\b(what|something) (no ?one|nobody) tells you\b/i, weight: 18, label: "AI hook" },
  { pattern: /\byears? (later|ago|from now),?\s+i (realize|understand|know|see)\b/i, weight: 15, label: "AI narrative arc" },

  // Engagement bait
  { pattern: /\bcomment (below|yes|"yes"|if you|to get)\b/i, weight: 20, label: "Engagement bait" },
  { pattern: /\bfollow (me )?for (more|daily|weekly)\b/i, weight: 22, label: "Engagement bait" },
  { pattern: /\brepost (this|if you agree|to)\b/i, weight: 22, label: "Engagement bait" },
  { pattern: /\bsave this (post|for later)\b/i, weight: 18, label: "Engagement bait" },
  { pattern: /\bwhat'?s? your (take|thoughts?|opinion|experience)\?/i, weight: 10, label: "Engagement bait" },
  { pattern: /\bagree\? (drop|comment|let me know)/i, weight: 15, label: "Engagement bait" },

  // Buzzword soup
  { pattern: /\bsynergy\b/i, weight: 12, label: "Buzzword" },
  { pattern: /\bparadigm (shift|changing)\b/i, weight: 15, label: "Buzzword" },
  { pattern: /\bthought leadership\b/i, weight: 10, label: "Buzzword" },
  { pattern: /\b(actionable|impactful) (insights?|tips?|advice|strategies)\b/i, weight: 14, label: "AI filler" },
  { pattern: /\bseamlessly\b/i, weight: 10, label: "AI word" },
  { pattern: /\btransformative\b/i, weight: 10, label: "AI word" },
  { pattern: /\bnavigate (the )?(complexities|challenges|landscape|ever.?changing)\b/i, weight: 14, label: "AI phrase" },
  { pattern: /\bfoster(ing)? (a |an? )?(culture|mindset|environment)\b/i, weight: 12, label: "AI phrase" },
  { pattern: /\bleverage\b/i, weight: 6, label: "LinkedIn buzzword" },
  { pattern: /\bunlock(ing)? (your|the|new)?\s*(potential|value|power|growth)\b/i, weight: 12, label: "AI phrase" },
  { pattern: /\bgame.?changer\b/i, weight: 14, label: "AI buzzword" },
  { pattern: /\b(pivotal|crucial|vital) (moment|role|step|time)\b/i, weight: 8, label: "AI intensifier" },

  // Listicle hooks
  { pattern: /\b\d+ (things|lessons|tips|ways|mistakes|reasons|steps|hacks|habits|traits|signs) (i|to|that|you|every|most)\b/i, weight: 14, label: "Listicle hook" },
  { pattern: /\b(most people|everyone) (don'?t|never|won'?t|fail to)\b/i, weight: 12, label: "AI contrarian hook" },

  // Unpopular opinion / hot take
  { pattern: /\bunpopular opinion:?\s/i, weight: 18, label: "AI opinion hook" },
  { pattern: /\bhot take:?\s/i, weight: 18, label: "AI opinion hook" },
  { pattern: /\bcontroversial (take|opinion|thought):?\s/i, weight: 18, label: "AI opinion hook" },
];

const EMOJI_STARTERS = ['🚀', '💡', '🎯', '🔥', '✅', '👇', '⚡', '🌟', '💪', '🎉', '🏆', '💯', '🙌', '👏', '📌', '🧵', '💥', '🤔', '😤', '📣'];

function countSyllables(word) {
  word = word.toLowerCase().replace(/[^a-z]/g, '');
  if (word.length <= 3) return 1;
  word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
  word = word.replace(/^y/, '');
  const m = word.match(/[aeiouy]{1,2}/g);
  return m ? Math.max(m.length, 1) : 1;
}

function scorePost(text) {
  if (!text || text.length < 60) return { score: 0, reasons: [] };

  const reasons = new Set();
  let score = 0;

  // 1. Phrase / pattern matching
  for (const rule of PHRASE_RULES) {
    if (rule.pattern.test(text)) {
      score += rule.weight;
      reasons.add(rule.label);
    }
  }

  // 2. Emoji starter density
  const first100 = text.slice(0, 100);
  const leadingEmojiHits = EMOJI_STARTERS.filter(e => first100.includes(e)).length;
  if (leadingEmojiHits >= 2) { score += 22; reasons.add("Emoji-heavy opener"); }
  else if (leadingEmojiHits === 1) { score += 8; reasons.add("Emoji opener"); }

  // 3. Total emoji count
  const emojiMatches = [...text].filter(c => {
    const cp = c.codePointAt(0);
    return (cp >= 0x1F300 && cp <= 0x1FAFF) || (cp >= 0x2600 && cp <= 0x27BF);
  });
  if (emojiMatches.length > 12) { score += 22; reasons.add("Excessive emojis"); }
  else if (emojiMatches.length > 6) { score += 10; reasons.add("Many emojis"); }

  // 4. Burstiness — sentence length variance (low stddev = AI-flat)
  const sentences = text.split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(s => s.split(/\s+/).length > 2);
  if (sentences.length >= 4) {
    const lengths = sentences.map(s => s.split(/\s+/).length);
    const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length;
    const stddev = Math.sqrt(lengths.reduce((a, b) => a + (b - mean) ** 2, 0) / lengths.length);
    if (stddev < 3 && mean > 7) { score += 22; reasons.add("Uniform sentence length"); }
    else if (stddev < 5 && mean > 7) { score += 10; reasons.add("Low sentence variance"); }
  }

  // 5. Type-token ratio (lexical diversity)
  const words = text.toLowerCase().match(/\b[a-z]{3,}\b/g) || [];
  if (words.length > 50) {
    const ttr = new Set(words).size / words.length;
    if (ttr < 0.38) { score += 22; reasons.add("Low lexical diversity"); }
    else if (ttr < 0.50) { score += 10; reasons.add("Moderate lexical diversity"); }
  }

  // 6. One-sentence-per-line format (classic LinkedIn AI formatting)
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length >= 8) {
    const shortLines = lines.filter(l => l.split(/\s+/).length <= 15).length;
    if (shortLines / lines.length > 0.75) { score += 18; reasons.add("One-sentence-per-line format"); }
  }

  // 7. Heavy numbered list
  const listItems = (text.match(/^\s*\d+[.)]\s/gm) || []).length;
  if (listItems >= 5) { score += 16; reasons.add("Heavy listicle"); }

  // 8. Flesch-Kincaid readability (AI posts cluster ~55–72)
  if (sentences.length > 2 && words.length > 20) {
    const syllables = words.reduce((a, w) => a + countSyllables(w), 0);
    const avgWps = words.length / sentences.length;
    const avgSpw = syllables / words.length;
    const fk = 206.835 - (1.015 * avgWps) - (84.6 * avgSpw);
    if (fk >= 52 && fk <= 72) { score += 12; reasons.add("AI-typical readability"); }
  }

  // 9. Very long post with low unique word ratio
  if (words.length > 200 && new Set(words).size / words.length < 0.45) {
    score += 14;
    reasons.add("Long post, repetitive vocabulary");
  }

  return { score, reasons: [...reasons] };
}
