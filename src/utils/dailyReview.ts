/**
 * Pure deterministic validation and scoring logic for Daily Growth Reflection / Review.
 *
 * Rules:
 * - Six conversational questions must all be answered (non-empty after trimming).
 * - Completion is self-reported; word count does not verify real-world accomplishment.
 * - Substantive review for full milestone eligibility requires >= 200 substantive words across all six answers.
 * - Shorter reflections are permitted to be submitted, but are not eligible for the 50 XP milestone.
 * - Filler / repeated token / repeated sentence detection prevents gaming without requiring AI/LLM heuristics.
 */

export interface CompletedTaskSnapshot {
  id: string;
  title: string;
  estimatedMinutes?: number;
  completedAt?: string;
}

export interface ReviewDraft {
  dayKey: string;
  answers: [string, string, string, string, string, string];
}

export interface ReflectionSnapshot {
  dayKey: string;
  answers: [string, string, string, string, string, string];
  wordCount: number;
  eligible: boolean;
  issues: string[];
  submittedAt: string;
  completedTaskIds: string[];
}

export interface ReviewValidationResult {
  wordCount: number;
  rawWordCount: number;
  eligible: boolean;
  issues: string[];
  limitations: string;
  allAnswered: boolean;
  canSubmit: boolean;
}

export const REVIEW_QUESTIONS: { key: number; title: string; prompt: string; placeholder: string }[] = [
  {
    key: 0,
    title: 'What got finished',
    prompt: 'Looking back honestly, which commitments did you truly finish, and what remains incomplete or changed?',
    placeholder: 'e.g. The errands, study blocks, or chores I actually finished — and what I moved to another day or let go of...'
  },
  {
    key: 1,
    title: 'What mattered',
    prompt: 'What did you accomplish today that mattered to you, and why did it matter?',
    placeholder: 'e.g. The conversation, meal, workout, or hour of study that made today feel worthwhile, and why it mattered...'
  },
  {
    key: 2,
    title: 'Evidence & uncertainty',
    prompt: 'What specific details or evidence support that progress, and where are you still uncertain?',
    placeholder: 'e.g. What I can point to — a finished task, notes from a call, how I felt after the walk — and what I am still unsure about...'
  },
  {
    key: 3,
    title: 'Challenges & choices',
    prompt: 'What challenged you, and how did your choices, circumstances, or energy shape your response?',
    placeholder: 'e.g. Today\'s tiredness, a hard conversation, a noisy day — and what I actually decided to do about it...'
  },
  {
    key: 4,
    title: 'What it taught me',
    prompt: 'What did today teach you about yourself, your habits, or what you value?',
    placeholder: 'e.g. What today showed me about when I do my best thinking, or when I simply need more rest...',
  },
  {
    key: 5,
    title: "Tomorrow's change",
    prompt: 'What is one realistic change you will make tomorrow, and what support or rest might help?',
    placeholder: "e.g. One small, realistic change for tomorrow — and the support or rest I'm giving myself to keep it..."
  }
];

export const REVIEW_LIMITATIONS_TEXT =
  'Notice: Task completion and reflection quality are strictly self-reported. Word count, timestamps, and formatting verify length and repetition patterns only, not real-world work or truthfulness. Skipping reflection never revokes task credit.';

/**
 * Normalizes unicode whitespace and extracts words (alphanumeric/letters/numbers).
 */
export function extractWords(text: string): string[] {
  if (!text) return [];
  // Normalize unicode whitespace (e.g. \u00A0, \u2000-\u200B, \u3000, etc.) to standard spaces
  const normalized = text.replace(/[\s\u00A0\u1680\u2000-\u200A\u2028\u2029\u202F\u205F\u3000\uFEFF]+/gu, ' ').trim();
  if (!normalized) return [];

  // Match words: sequences of unicode letters, numbers, or standard word chars
  // Supports international letters, hyphens inside words
  const words = normalized.split(/\s+/).filter(w => {
    // Strip leading/trailing punctuation from word token
    const cleaned = w.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
    return cleaned.length > 0;
  });

  return words;
}

/**
 * Detects obvious repeated tokens, repeating sentences, or repeated n-grams.
 * Returns { isFiller: boolean; reason?: string; substantiveWordCount: number }
 */
export function analyzeFillerAndRepetition(text: string): {
  isFiller: boolean;
  reason?: string;
  substantiveWordCount: number;
} {
  const words = extractWords(text);
  const rawWordCount = words.length;

  if (rawWordCount === 0) {
    return { isFiller: false, substantiveWordCount: 0 };
  }

  const lowerWords = words.map(w => w.toLowerCase().replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, ''));

  // 1. Check for single token repetition dominance (e.g. "lorem lorem lorem" or "test test test")
  const wordFreq: Record<string, number> = {};
  for (const w of lowerWords) {
    wordFreq[w] = (wordFreq[w] || 0) + 1;
  }

  let maxSingleWordCount = 0;
  let dominantWord = '';
  for (const [w, count] of Object.entries(wordFreq)) {
    if (count > maxSingleWordCount) {
      maxSingleWordCount = count;
      dominantWord = w;
    }
  }

  // If a single word makes up > 35% of the total words when word count >= 10, or >= 5 repeats in small text
  if (rawWordCount >= 10 && maxSingleWordCount / rawWordCount > 0.35) {
    return {
      isFiller: true,
      reason: `Excessive repetition of single word "${dominantWord}" (${Math.round((maxSingleWordCount / rawWordCount) * 100)}% of content)`,
      substantiveWordCount: Math.max(0, rawWordCount - maxSingleWordCount)
    };
  }

  // 2. Check for repeated phrases / sentences (n-gram repetitions, e.g. 3-word or 4-word identical chunks repeated >= 4 times)
  if (rawWordCount >= 20) {
    const trigrams: Record<string, number> = {};
    for (let i = 0; i <= lowerWords.length - 3; i++) {
      const tg = `${lowerWords[i]} ${lowerWords[i + 1]} ${lowerWords[i + 2]}`;
      trigrams[tg] = (trigrams[tg] || 0) + 1;
    }
    for (const [tg, count] of Object.entries(trigrams)) {
      if (count >= 5 || (rawWordCount < 60 && count >= 3 && count * 3 >= rawWordCount * 0.4)) {
        return {
          isFiller: true,
          reason: `Repeated phrase pattern detected: "${tg}" (${count} times)`,
          substantiveWordCount: Math.max(0, rawWordCount - (count * 3))
        };
      }
    }
  }

  // 3. Repeated sentence detection
  const sentences = text
    .split(/[.!?\n]+/)
    .map(s => s.trim().toLowerCase())
    .filter(s => s.length > 5);

  if (sentences.length >= 3) {
    const sentenceFreq: Record<string, number> = {};
    for (const s of sentences) {
      sentenceFreq[s] = (sentenceFreq[s] || 0) + 1;
    }
    for (const [, count] of Object.entries(sentenceFreq)) {
      if (count >= 3) {
        return {
          isFiller: true,
          reason: `Repeated sentence detected (${count} identical occurrences)`,
          substantiveWordCount: Math.max(0, Math.floor(rawWordCount / count))
        };
      }
    }
  }

  return {
    isFiller: false,
    substantiveWordCount: rawWordCount
  };
}

/**
 * Validates the six answers for daily growth review.
 *
 * Rules:
 * - All six answers must be non-empty (canSubmit = true).
 * - Full milestone eligibility requires:
 *   1. All six answers non-empty
 *   2. No disqualifying repeated filler/token abuse
 *   3. Total substantive word count >= 200
 */
export function validateDailyReview(answers: string[] | [string, string, string, string, string, string]): ReviewValidationResult {
  const issues: string[] = [];

  const safeAnswers = [
    answers[0] || '',
    answers[1] || '',
    answers[2] || '',
    answers[3] || '',
    answers[4] || '',
    answers[5] || ''
  ];

  let rawTotalWords = 0;
  let substantiveTotalWords = 0;
  let missingAnswerCount = 0;
  let fillerDetected = false;

  for (let i = 0; i < 6; i++) {
    const ans = safeAnswers[i].trim();
    if (ans.length === 0) {
      missingAnswerCount++;
      issues.push(`Question ${i + 1} (${REVIEW_QUESTIONS[i].title}) is not answered.`);
    } else {
      const words = extractWords(ans);
      rawTotalWords += words.length;

      const analysis = analyzeFillerAndRepetition(ans);
      if (analysis.isFiller) {
        fillerDetected = true;
        issues.push(`Question ${i + 1}: ${analysis.reason}`);
      }
      substantiveTotalWords += analysis.substantiveWordCount;
    }
  }

  // Also analyze cross-answer repetition (e.g. copy-pasting the exact same paragraph to multiple questions)
  const trimmedNonEmpty = safeAnswers.map(a => a.trim().toLowerCase()).filter(a => a.length > 0);
  const uniqueAnswers = new Set(trimmedNonEmpty);
  if (trimmedNonEmpty.length > uniqueAnswers.size) {
    fillerDetected = true;
    issues.push('Identical responses provided across different reflection questions.');
  }

  // Combined text analysis across all answers
  const combinedText = safeAnswers.join(' ');
  const overallAnalysis = analyzeFillerAndRepetition(combinedText);
  if (overallAnalysis.isFiller && !fillerDetected) {
    fillerDetected = true;
    issues.push(`Overall reflection: ${overallAnalysis.reason}`);
  }

  const allAnswered = missingAnswerCount === 0;
  const canSubmit = allAnswered;

  // Eligibility for the 50 XP milestone:
  // Requires all 6 answered, no detected filler patterns, and substantive total words >= 200.
  const meetsWordCount = substantiveTotalWords >= 200;
  const eligible = allAnswered && !fillerDetected && meetsWordCount;

  if (allAnswered) {
    if (!meetsWordCount) {
      issues.push(
        `Word count is ${substantiveTotalWords}/200. Shorter reflections can be saved/submitted, but 200 substantive words are required for the 50 XP milestone.`
      );
    }
  }

  return {
    wordCount: substantiveTotalWords,
    rawWordCount: rawTotalWords,
    eligible,
    issues,
    limitations: REVIEW_LIMITATIONS_TEXT,
    allAnswered,
    canSubmit
  };
}
