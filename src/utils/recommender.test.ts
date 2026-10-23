import {
  generateCandidatePool,
  scoreCandidate,
  recordApproval,
  recordRejection,
  getRankedRecommendations,
} from './recommender';
import { DEFAULT_INITIAL_PREFERENCES } from '../data/seedData';
import { RecommendationCandidate } from '../types';

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

console.log('--- Testing recommender.ts ---');

// 1. Candidate pool generation
{
  const pool = generateCandidatePool();
  assert(pool.length >= 10, `Candidate pool has at least 10 items (got ${pool.length})`);

  const hasHackerNews = pool.some((c) => c.url?.includes('news.ycombinator.com'));
  assert(hasHackerNews, 'Candidate pool includes Hacker News');

  const hasLongform = pool.some((c) => c.url?.includes('longform.org'));
  assert(hasLongform, 'Candidate pool includes Longform.org');

  const hasBookHabit = pool.some((c) => c.title.toLowerCase().includes('book') && c.kind === 'habit');
  assert(hasBookHabit, 'Candidate pool includes offline physical book habit');

  const hasMailHabit = pool.some((c) => c.title.toLowerCase().includes('mail'));
  assert(hasMailHabit, 'Candidate pool includes mail habit');
}

// 2. Candidate scoring
{
  const testCandidate: RecommendationCandidate = {
    id: 'test-1',
    title: 'Test Web Candidate',
    url: 'https://example.com',
    kind: 'web',
    category: 'Reading',
    tags: ['Reading', 'Essays'],
    durationEstimateMinutes: 15,
    sourceType: 'curated_web',
    rationale: 'Test rationale',
  };

  const initialScore = scoreCandidate(testCandidate, DEFAULT_INITIAL_PREFERENCES, 'evening');
  assert(initialScore > 0, 'Candidate receives positive baseline score');

  // Candidate with matching preference gets higher score
  const boostedPrefs = {
    ...DEFAULT_INITIAL_PREFERENCES,
    tagWeights: {
      ...DEFAULT_INITIAL_PREFERENCES.tagWeights,
      Reading: 10,
    },
  };
  const boostedScore = scoreCandidate(testCandidate, boostedPrefs, 'evening');
  assert(boostedScore > initialScore, 'Tag weight boost elevates candidate score');

  // Candidate with recent rejection gets severe penalty
  const rejectedPrefs = {
    ...DEFAULT_INITIAL_PREFERENCES,
    recentRejections: [{ id: 'test-1', timestamp: Date.now() }],
  };
  const rejectedScore = scoreCandidate(testCandidate, rejectedPrefs, 'evening');
  assert(rejectedScore < 0, 'Recently rejected candidate receives severe penalty');
}

// 3. Record approval
{
  const testCandidate: RecommendationCandidate = {
    id: 'test-approve',
    title: 'Approved Candidate',
    url: 'https://longform.org',
    kind: 'web',
    category: 'Reading',
    tags: ['Reading', 'Essays'],
    durationEstimateMinutes: 20,
    sourceType: 'curated_web',
    rationale: 'Test',
  };

  const nextPrefs = recordApproval(DEFAULT_INITIAL_PREFERENCES, testCandidate, 'evening');
  assertEqual(nextPrefs.approvalsCount, DEFAULT_INITIAL_PREFERENCES.approvalsCount + 1, 'Increments approvalsCount');
  assert((nextPrefs.tagWeights['Reading'] || 0) >= (DEFAULT_INITIAL_PREFERENCES.tagWeights['Reading'] || 0), 'Boosts tag weight for Reading');
}

// 4. Record rejection
{
  const testCandidate: RecommendationCandidate = {
    id: 'test-reject',
    title: 'Rejected Candidate',
    kind: 'habit',
    category: 'Offline',
    tags: ['Offline'],
    durationEstimateMinutes: 10,
    sourceType: 'habit_idea',
    rationale: 'Test',
  };

  const nextPrefs = recordRejection(DEFAULT_INITIAL_PREFERENCES, testCandidate, 'morning');
  assertEqual(nextPrefs.rejectionsCount, DEFAULT_INITIAL_PREFERENCES.rejectionsCount + 1, 'Increments rejectionsCount');
  assert(nextPrefs.recentRejections.some((r) => r.id === 'test-reject'), 'Adds candidate to recentRejections');
}

// 5. Ranking
{
  const pool = generateCandidatePool();
  const ranked = getRankedRecommendations(pool, DEFAULT_INITIAL_PREFERENCES, 'morning', 1);
  assertEqual(ranked.length, 1, 'Returns top recommendation');
  assert(Boolean(ranked[0].title), 'Ranked candidate has a valid title');
}

console.log('------------------------------------');
if (failures === 0) {
  console.log('🎉 ALL RECOMMENDER TESTS PASSED SUCCESSFULLY!');
  process.exit(0);
} else {
  console.error(`💥 ${failures} assertion(s) failed.`);
  process.exit(1);
}
