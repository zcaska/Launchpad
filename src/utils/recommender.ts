import { 
  LinkItem, 
  Folder, 
  LearnedPreferences, 
  RecommendationCandidate, 
  TimeOfDayBucket 
} from '../types';
import { CURATED_FOCUS_SUGGESTIONS, DEFAULT_MICRO_QUESTS } from '../data/seedData';
import { getTimeOfDayBucket } from './timeBudget';

export function generateCandidatePool(
  _links?: LinkItem[],
  _folders?: Folder[]
): RecommendationCandidate[] {
  const basePool = CURATED_FOCUS_SUGGESTIONS || DEFAULT_MICRO_QUESTS;
  return basePool.map((quest) => ({ ...quest }));
}

export function scoreCandidate(
  candidate: RecommendationCandidate,
  prefs: LearnedPreferences,
  timeOfDay: TimeOfDayBucket
): number {
  let score = 5.0; // baseline score

  const categoryKey = candidate.category || candidate.folderName || candidate.folderId;

  // 1. Category weight
  if (categoryKey && prefs.categoryWeights[categoryKey]) {
    score += prefs.categoryWeights[categoryKey] * 2.0;
  }

  // 2. Tag weights
  if (candidate.tags && candidate.tags.length > 0) {
    candidate.tags.forEach((tag) => {
      if (prefs.tagWeights[tag]) {
        score += prefs.tagWeights[tag] * 1.5;
      }
    });
  }

  // 3. Time-of-day affinity
  const timeAffinityMap = prefs.timeOfDayAffinity[timeOfDay] || {};
  if (categoryKey && timeAffinityMap[categoryKey]) {
    score += timeAffinityMap[categoryKey] * 2.5;
  }

  // 4. Source type bias
  if (candidate.sourceType === 'curated_web') {
    score += 1.6;
  } else if (candidate.sourceType === 'habit_idea') {
    score += 1.4;
  } else if (candidate.sourceType === 'reading_list') {
    score += 1.8;
  } else if (candidate.sourceType === 'micro_quest') {
    score += 1.2;
  }

  // 5. Recent rejection penalty (suppress for 2 hours)
  const twoHoursAgo = Date.now() - 7200000;
  const wasRecentlyRejected = prefs.recentRejections.some(
    (r) => r.id === candidate.id && r.timestamp > twoHoursAgo
  );
  if (wasRecentlyRejected) {
    score -= 40.0; // severe temporary penalty
  }

  // 6. Multi-Armed Bandit Epsilon exploration noise (random factor)
  const explorationNoise = (Math.random() - 0.5) * 2.0;
  score += explorationNoise;

  return score;
}

export function getRankedRecommendations(
  candidates: RecommendationCandidate[],
  prefs: LearnedPreferences,
  timeOfDay: TimeOfDayBucket = getTimeOfDayBucket(),
  limit: number = 1
): RecommendationCandidate[] {
  if (candidates.length === 0) return [];

  const scored = candidates.map((cand) => {
    const calculatedScore = scoreCandidate(cand, prefs, timeOfDay);
    
    // Generate dynamic rationale
    let dynamicRationale = cand.rationale;
    if (timeOfDay === 'evening' && (cand.sourceType === 'reading_list' || cand.tags.includes('Reading'))) {
      dynamicRationale = '🌙 High evening reading affinity — perfect for unwinding productively.';
    } else if (timeOfDay === 'morning' && cand.tags.includes('Coding')) {
      dynamicRationale = '☀️ Morning mental sharpness recommendation.';
    } else if (cand.tags.some(t => prefs.tagWeights[t] && prefs.tagWeights[t] > 2)) {
      const topTag = cand.tags.find(t => prefs.tagWeights[t] > 2);
      dynamicRationale = `⭐ Recommended because you frequently explore #${topTag}.`;
    }

    return {
      ...cand,
      score: calculatedScore,
      rationale: dynamicRationale,
    };
  });

  // Sort descending by score
  scored.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

  return scored.slice(0, limit);
}

export function recordApproval(
  prevPrefs: LearnedPreferences,
  candidate: RecommendationCandidate,
  timeOfDay: TimeOfDayBucket
): LearnedPreferences {
  const newCategoryWeights = { ...prevPrefs.categoryWeights };
  const newTagWeights = { ...prevPrefs.tagWeights };
  const newTimeAffinity = { ...prevPrefs.timeOfDayAffinity };

  const categoryKey = candidate.category || candidate.folderName || candidate.folderId;

  // Boost category (+1.0)
  if (categoryKey) {
    newCategoryWeights[categoryKey] = (newCategoryWeights[categoryKey] || 0) + 1.0;
  }

  // Boost tags (+0.6)
  candidate.tags.forEach((tag) => {
    newTagWeights[tag] = Math.min(10, (newTagWeights[tag] || 0) + 0.6);
  });

  // Boost time-of-day affinity (+1.2)
  if (categoryKey) {
    if (!newTimeAffinity[timeOfDay]) newTimeAffinity[timeOfDay] = {};
    newTimeAffinity[timeOfDay][categoryKey] = (newTimeAffinity[timeOfDay][categoryKey] || 0) + 1.2;
  }

  return {
    ...prevPrefs,
    categoryWeights: newCategoryWeights,
    tagWeights: newTagWeights,
    timeOfDayAffinity: newTimeAffinity,
    approvalsCount: prevPrefs.approvalsCount + 1,
  };
}

export function recordRejection(
  prevPrefs: LearnedPreferences,
  candidate: RecommendationCandidate,
  timeOfDay: TimeOfDayBucket
): LearnedPreferences {
  const newCategoryWeights = { ...prevPrefs.categoryWeights };
  const newTagWeights = { ...prevPrefs.tagWeights };
  const newTimeAffinity = { ...prevPrefs.timeOfDayAffinity };

  const categoryKey = candidate.category || candidate.folderName || candidate.folderId;

  // Slight penalty on category (-0.4)
  if (categoryKey) {
    newCategoryWeights[categoryKey] = Math.max(-5, (newCategoryWeights[categoryKey] || 0) - 0.4);
  }

  // Slight penalty on tags (-0.3)
  candidate.tags.forEach((tag) => {
    newTagWeights[tag] = Math.max(-5, (newTagWeights[tag] || 0) - 0.3);
  });

  // Suppress time of day category (-0.5)
  if (categoryKey) {
    if (!newTimeAffinity[timeOfDay]) newTimeAffinity[timeOfDay] = {};
    newTimeAffinity[timeOfDay][categoryKey] = (newTimeAffinity[timeOfDay][categoryKey] || 0) - 0.5;
  }

  // Add to recent rejections (keep latest 30)
  const recentRejections = [
    { id: candidate.id, timestamp: Date.now() },
    ...prevPrefs.recentRejections.slice(0, 29),
  ];

  return {
    ...prevPrefs,
    categoryWeights: newCategoryWeights,
    tagWeights: newTagWeights,
    timeOfDayAffinity: newTimeAffinity,
    rejectionsCount: prevPrefs.rejectionsCount + 1,
    recentRejections,
  };
}

// Optional OpenRouter API Web Discovery fallback
export async function fetchOpenRouterIdea(
  apiKey: string,
  model: string = 'google/gemini-2.0-flash-001',
  userGoal: string = 'Deep work'
): Promise<RecommendationCandidate | null> {
  if (!apiKey || !apiKey.trim()) return null;

  try {
    const prompt = `Suggest 1 high-quality, highly engaging, and productive web article, tutorial, or educational resource for a curious student/developer whose goal is "${userGoal}".
Return ONLY a valid JSON object with:
{
  "title": "Clear actionable title",
  "url": "https://...",
  "description": "Short 1-2 sentence compelling summary",
  "tags": ["Tag1", "Tag2"],
  "durationEstimateMinutes": 15,
  "rationale": "Why this is high-signal"
}`;

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey.trim()}`,
        'HTTP-Referer': window.location.origin || 'http://localhost:5173',
        'X-Title': 'LaunchPad Focus Dashboard',
      },
      body: JSON.stringify({
        model: model || 'google/gemini-2.0-flash-001',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        max_tokens: 300,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      console.warn('OpenRouter API request failed with status:', response.status);
      return null;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return null;

    const parsed = JSON.parse(content);
    return {
      id: `openrouter-${Date.now()}`,
      title: parsed.title || 'Curated Productive Web Deep-Dive',
      url: parsed.url || 'https://news.ycombinator.com',
      description: parsed.description || 'AI-discovered high-signal article.',
      folderName: 'AI Web Discovery',
      tags: Array.isArray(parsed.tags) ? parsed.tags : ['Learning', 'Web'],
      durationEstimateMinutes: parsed.durationEstimateMinutes || 15,
      sourceType: 'ai_web',
      rationale: `✨ AI Curated Idea: ${parsed.rationale || 'Matched to your focus goal'}`,
    };
  } catch (err) {
    console.error('Failed to fetch from OpenRouter:', err);
    return null;
  }
}
