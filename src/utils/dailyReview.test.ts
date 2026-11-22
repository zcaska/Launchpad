/**
 * Focused behavioral tests for daily review validation utility:
 * - 199 vs 200 substantive words
 * - Repeated filler / token repetition detection
 * - Mixed legitimate text vs repetitive loops
 * - Unicode whitespace normalization
 * - Six-answer completeness requirement
 * - Shorter reflection submittable vs milestone eligibility
 */

import {
  extractWords,
  analyzeFillerAndRepetition,
  validateDailyReview,
  REVIEW_QUESTIONS
} from './dailyReview';

let failures = 0;

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ Assertion FAILED: ${message}`);
    failures++;
  } else {
    console.log(`✅ ${message}`);
  }
}

function assertEqual<T>(actual: T, expected: T, message: string) {
  if (actual !== expected) {
    console.error(`❌ Assertion FAILED: ${message} (expected ${expected}, got ${actual})`);
    failures++;
  } else {
    console.log(`✅ ${message}`);
  }
}

console.log('--- Testing src/utils/dailyReview.ts ---');

// 1. extractWords & Unicode whitespace
{
  const textWithUnicodeSpaces = 'Word1\u00A0Word2\u2000Word3\u2003Word4\u3000Word5\t\nWord6';
  const words = extractWords(textWithUnicodeSpaces);
  assertEqual(words.length, 6, 'extractWords handles various unicode whitespace characters');
  assertEqual(words.join(' '), 'Word1 Word2 Word3 Word4 Word5 Word6', 'extracted words clean punctuation/spacing');

  const emptyWords = extractWords('   \u00A0\u3000   ');
  assertEqual(emptyWords.length, 0, 'extractWords handles whitespace-only text');
}

// 2. Six conversational questions completeness
{
  assertEqual(REVIEW_QUESTIONS.length, 6, 'There are exactly 6 conversational review questions');

  // All empty
  const emptyValidation = validateDailyReview(['', '', '', '', '', '']);
  assertEqual(emptyValidation.allAnswered, false, 'Empty answers fails allAnswered');
  assertEqual(emptyValidation.canSubmit, false, 'Empty answers cannot be submitted');
  assertEqual(emptyValidation.eligible, false, 'Empty answers not eligible');
  assertEqual(emptyValidation.wordCount, 0, 'Empty answers word count is 0');

  // Only 5 answered
  const fiveAnswered = validateDailyReview([
    'I finished the task today as planned.',
    'I built the review component UI and validation utility.',
    'Test logs and diff outputs verified the changes.',
    'Ran into some difficulties with debounce timers.',
    'I learned to keep pure utilities isolated.',
    '' // Missing 6th
  ]);
  assertEqual(fiveAnswered.allAnswered, false, '5/6 answers fails allAnswered');
  assertEqual(fiveAnswered.canSubmit, false, 'Missing question prevents submission');
  assertEqual(fiveAnswered.eligible, false, 'Missing question is not eligible for milestone');
  assert(fiveAnswered.issues.some(i => i.includes('Question 6')), 'Issues indicate Question 6 is missing');
}

// 3. Shorter reflection submission allowed, but milestone not eligible (<200 words)
{
  const shortAnswers: [string, string, string, string, string, string] = [
    'I completed my planned deep work session today.',
    'Wrote the new review component and tests.',
    'Evidence is in the git status and passing test command.',
    'Had mild fatigue midway through the afternoon.',
    'Breaking work into smaller bounded slices helped.',
    'Tomorrow I will start earlier and prep tasks the night before.'
  ];
  const shortValidation = validateDailyReview(shortAnswers);
  assertEqual(shortValidation.allAnswered, true, 'All 6 are answered');
  assertEqual(shortValidation.canSubmit, true, 'Shorter reflection can be submitted');
  assertEqual(shortValidation.eligible, false, 'Shorter reflection (<200 words) is NOT eligible for 50 XP milestone');
  assert(shortValidation.wordCount < 200, 'Word count is below 200');
  assert(shortValidation.issues.some(i => i.includes('50 XP milestone')), 'Issue notes 50 XP milestone requirement');
}

// 4. 199 words vs 200 words threshold test
{
  // 6 realistic distinct answers
  const baseAnswers: [string, string, string, string, string, string] = [
    'Today I focused on building the daily growth reflection component and finishing scheduled review milestones without getting sidetracked by secondary items.', // 20
    'I implemented the standalone chat-style review panel, draft auto-saving logic, and pure validation algorithms in separate modules.', // 17
    'Evidence is demonstrated by passing tsx test suites, strict validation thresholds, and verifiable error state handling on failed persistence promises.', // 18
    'The primary difficulty was ensuring rapid typing while auto-saving never causes stale overwrites or drops user input midway through a thought.', // 20
    'I learned that keeping storage effects outside the UI component preserves modularity and makes testing deterministic validation much more reliable.', // 19
    'Tomorrow I plan to wire the component into the growth dashboard and verify keyboard navigation across the entire question progression flow.' // 20
  ];
  // Expand answers with diverse paragraphs to reach 199 and 200 words
  const p1 = 'We must ensure high fidelity across all metrics. Clear thinking leads to solid architecture and dependable software systems for every user.';
  const p2 = 'Detailed logging and verification records keep our engineering standards robust against unexpected edge cases or silent regressions.';
  const p3 = 'Careful attention to typography, spacing, and accessibility ensures that mobile users experience seamless navigation during evening reviews.';

  // Build 199 and 200 words precisely
  const ans0 = `${baseAnswers[0]} ${p1} ${p2}`; // 20 + 20 + 17 = 57 words
  const ans1 = `${baseAnswers[1]} ${p3}`; // 17 + 19 = 36 words
  const ans2 = `${baseAnswers[2]} ${p1}`; // 18 + 20 = 38 words
  const ans3 = `${baseAnswers[3]}`; // 20 words
  const ans4 = `${baseAnswers[4]}`; // 19 words

  // Let's count words up to here
  const partial = [ans0, ans1, ans2, ans3, ans4].map(a => extractWords(a).length).reduce((a, b) => a + b, 0);
  const needed199 = 199 - partial;
  const needed200 = 200 - partial;

  const extraWords = [
    'tomorrow', 'we', 'will', 'review', 'metrics', 'early', 'and', 'adjust',
    'tactical', 'priorities', 'based', 'upon', 'actual', 'friction', 'points',
    'observed', 'during', 'execution', 'cycles', 'with', 'careful', 'documentation',
    'recorded', 'in', 'our', 'audit', 'logs', 'faithfully', 'and', 'consistently'
  ];

  const ans5_199 = extraWords.slice(0, needed199).join(' ');
  const ans5_200 = extraWords.slice(0, needed200).join(' ');

  const answers199: [string, string, string, string, string, string] = [ans0, ans1, ans2, ans3, ans4, ans5_199];
  const answers200: [string, string, string, string, string, string] = [ans0, ans1, ans2, ans3, ans4, ans5_200];

  const validation199 = validateDailyReview(answers199);
  assertEqual(validation199.rawWordCount, 199, 'Total raw words is exactly 199');
  assertEqual(validation199.wordCount, 199, 'Total substantive words is exactly 199');
  assertEqual(validation199.canSubmit, true, '199 words is submittable');
  assertEqual(validation199.eligible, false, '199 words is strictly NOT eligible for milestone');

  const validation200 = validateDailyReview(answers200);
  assertEqual(validation200.rawWordCount, 200, 'Total raw words is exactly 200');
  assertEqual(validation200.wordCount, 200, 'Total substantive words is exactly 200');
  assertEqual(validation200.canSubmit, true, '200 words is submittable');
  assertEqual(validation200.eligible, true, '200 substantive words IS eligible for milestone');
  assertEqual(validation200.issues.length, 0, 'No issues reported for 200 substantive words');
}

// 5. Filler and obvious repetition detection
{
  // A. Dominant single word repetition: e.g. "task" repeated 150 times
  const repeatedWordText = Array(150).fill('task').join(' ');
  const singleWordAnalysis = analyzeFillerAndRepetition(repeatedWordText);
  assertEqual(singleWordAnalysis.isFiller, true, 'Single word spam is identified as filler');

  // B. Repeated sentence loop: e.g. "I did a great job today." repeated 15 times
  const repeatedSentence = Array(10).fill('I did a great job today with my daily work').join('. ');
  const sentenceAnalysis = analyzeFillerAndRepetition(repeatedSentence);
  assertEqual(sentenceAnalysis.isFiller, true, 'Repeating the same sentence is identified as filler');

  // C. Full review where one answer contains 200 words of filler
  const fillerAnswers: [string, string, string, string, string, string] = [
    'I finished all my tasks today.',
    Array(50).fill('done').join(' '), // 50 times "done"
    'See the code diffs for proof.',
    'There were no major difficulties.',
    'Good focus maintained.',
    'Continue the same momentum tomorrow.'
  ];
  const fillerValidation = validateDailyReview(fillerAnswers);
  assertEqual(fillerValidation.canSubmit, true, 'Can still submit reflection text');
  assertEqual(fillerValidation.eligible, false, 'Filler makes reflection ineligible for 50 XP milestone');
  assert(fillerValidation.issues.some(i => i.toLowerCase().includes('repetition') || i.toLowerCase().includes('filler')), 'Issue identifies repetition');

  // D. Copying identical answer across all 6 prompts
  const identicalAnswers: [string, string, string, string, string, string] = [
    'Everything was executed according to schedule with no major discrepancies found.',
    'Everything was executed according to schedule with no major discrepancies found.',
    'Everything was executed according to schedule with no major discrepancies found.',
    'Everything was executed according to schedule with no major discrepancies found.',
    'Everything was executed according to schedule with no major discrepancies found.',
    'Everything was executed according to schedule with no major discrepancies found.'
  ];
  const identicalValidation = validateDailyReview(identicalAnswers);
  assertEqual(identicalValidation.eligible, false, 'Identical copy-pasted responses are not eligible');
  assert(identicalValidation.issues.some(i => i.includes('Identical responses')), 'Issue flags duplicate across prompts');

  // E. Vocabulary-diversity heuristic removed: genuine prose reusing common
  // topic words must NOT be flagged as filler and keeps its full word count.
  {
    const genuineProse = [
      'The focus plan worked well today because the work environment stayed quiet and the definition of done was clear before I started the work.',
      'I spent the afternoon on the review refactor, and the review refactor produced a smaller diff than expected without breaking any existing review behavior.',
      'One useful pattern was writing the results down immediately, since writing results immediately kept every follow-up question anchored to actual outcomes.',
      'A remaining risk is that late meetings compress my focus block, so tomorrow the focus block will start right after the first scheduled meeting ends.'
    ].join(' ');

    const analysis = analyzeFillerAndRepetition(genuineProse);
    assertEqual(analysis.isFiller, false, 'Genuine prose reusing topic words is not flagged as filler');
    assertEqual(analysis.substantiveWordCount, extractWords(genuineProse).length, 'Genuine prose keeps its full substantive word count');

    const answers = [genuineProse, genuineProse.slice(0, Math.floor(genuineProse.length * 0.55)), '',
      '', '', ''] as [string, string, string, string, string, string];
    const notAllAnswered = validateDailyReview(answers);
    assertEqual(notAllAnswered.canSubmit, false, 'Partially answered genuine prose cannot submit');
  }
}

// 6. Limitations notice is present
{
  const val = validateDailyReview(['a', 'b', 'c', 'd', 'e', 'f']);
  assert(val.limitations.length > 0, 'Limitations disclaimer text is populated');
  assert(val.limitations.includes('self-reported'), 'Limitations explicitly note self-reported completion');
}

if (failures > 0) {
  console.error(`\n❌ Total test failures: ${failures}`);
  process.exit(1);
} else {
  console.log('\n✅ All dailyReview tests passed successfully!');
}
