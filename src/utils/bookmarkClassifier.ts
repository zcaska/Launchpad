import { Folder, BookmarkClassificationResult, BookmarkClassificationConfidence } from '../types';

export const FOLDER_CLASSES = 'folder-classes';
export const FOLDER_WORK = 'folder-work';
export const FOLDER_READING = 'folder-reading';
export const FOLDER_BOOKMARKS = 'folder-bookmarks';

/**
 * Domain-to-category mapping rules with associated tags.
 * High confidence exact or suffix domain matches.
 */
export const DEFAULT_DOMAIN_CATEGORY_RULES: Record<string, { folderId: string; tags: string[] }> = {
  // Classes & Studies (Education, LMS, Academics, University)
  'canvas.instructure.com': { folderId: FOLDER_CLASSES, tags: ['School', 'LMS', 'Study'] },
  'blackboard.com': { folderId: FOLDER_CLASSES, tags: ['School', 'LMS', 'Study'] },
  'edx.org': { folderId: FOLDER_CLASSES, tags: ['Courses', 'Learning'] },
  'coursera.org': { folderId: FOLDER_CLASSES, tags: ['Courses', 'Learning'] },
  'udemy.com': { folderId: FOLDER_CLASSES, tags: ['Courses', 'Tutorial'] },
  'khanacademy.org': { folderId: FOLDER_CLASSES, tags: ['Education', 'Study'] },
  'quizlet.com': { folderId: FOLDER_CLASSES, tags: ['Study', 'Flashcards'] },
  'moodle.org': { folderId: FOLDER_CLASSES, tags: ['LMS', 'School'] },
  'piazza.com': { folderId: FOLDER_CLASSES, tags: ['School', 'Q&A'] },
  'gradescope.com': { folderId: FOLDER_CLASSES, tags: ['School', 'Grades'] },
  'overleaf.com': { folderId: FOLDER_CLASSES, tags: ['LaTeX', 'Academic', 'Writing'] },
  'chegg.com': { folderId: FOLDER_CLASSES, tags: ['Study', 'Homework'] },
  'duolingo.com': { folderId: FOLDER_CLASSES, tags: ['Language', 'Learning'] },
  'ocw.mit.edu': { folderId: FOLDER_CLASSES, tags: ['Courses', 'Learning', 'MIT'] },

  // Work & Projects (Code, Dev, Project Mgmt, Design)
  'github.com': { folderId: FOLDER_WORK, tags: ['Dev', 'Code', 'Git'] },
  'gitlab.com': { folderId: FOLDER_WORK, tags: ['Dev', 'Git'] },
  'bitbucket.org': { folderId: FOLDER_WORK, tags: ['Dev', 'Git'] },
  'linear.app': { folderId: FOLDER_WORK, tags: ['Work', 'Project', 'Issues'] },
  'jira.atlassian.com': { folderId: FOLDER_WORK, tags: ['Work', 'Jira', 'Agile'] },
  'atlassian.net': { folderId: FOLDER_WORK, tags: ['Work', 'Docs'] },
  'figma.com': { folderId: FOLDER_WORK, tags: ['Design', 'UI', 'Figma'] },
  'vercel.com': { folderId: FOLDER_WORK, tags: ['DevOps', 'Hosting', 'Dev'] },
  'netlify.com': { folderId: FOLDER_WORK, tags: ['DevOps', 'Hosting'] },
  'aws.amazon.com': { folderId: FOLDER_WORK, tags: ['Cloud', 'AWS', 'DevOps'] },
  'console.aws.amazon.com': { folderId: FOLDER_WORK, tags: ['Cloud', 'AWS'] },
  'console.cloud.google.com': { folderId: FOLDER_WORK, tags: ['Cloud', 'GCP'] },
  'portal.azure.com': { folderId: FOLDER_WORK, tags: ['Cloud', 'Azure'] },
  'postman.com': { folderId: FOLDER_WORK, tags: ['API', 'Dev', 'Testing'] },
  'datadoghq.com': { folderId: FOLDER_WORK, tags: ['Observability', 'Work'] },
  'sentry.io': { folderId: FOLDER_WORK, tags: ['Dev', 'Errors'] },
  'docker.com': { folderId: FOLDER_WORK, tags: ['DevOps', 'Docker'] },
  'hub.docker.com': { folderId: FOLDER_WORK, tags: ['DevOps', 'Docker'] },
  'stackoverflow.com': { folderId: FOLDER_WORK, tags: ['Dev', 'Coding', 'Q&A'] },
  'stackexchange.com': { folderId: FOLDER_WORK, tags: ['Dev', 'Q&A'] },
  'npm.js': { folderId: FOLDER_WORK, tags: ['Dev', 'NPM'] },
  'npmjs.com': { folderId: FOLDER_WORK, tags: ['Dev', 'NPM'] },
  'pypi.org': { folderId: FOLDER_WORK, tags: ['Python', 'Dev'] },
  'trello.com': { folderId: FOLDER_WORK, tags: ['Work', 'Kanban'] },
  'asana.com': { folderId: FOLDER_WORK, tags: ['Work', 'Tasks'] },
  'slack.com': { folderId: FOLDER_WORK, tags: ['Work', 'Chat'] },
  'notion.so': { folderId: FOLDER_WORK, tags: ['Notes', 'Docs', 'Work'] },
  'miro.com': { folderId: FOLDER_WORK, tags: ['Design', 'Whiteboard'] },

  // Reading List (Articles, Research, Blogs, News, Books)
  'arxiv.org': { folderId: FOLDER_READING, tags: ['Research', 'Papers', 'AI'] },
  'substack.com': { folderId: FOLDER_READING, tags: ['Newsletter', 'Reading'] },
  'medium.com': { folderId: FOLDER_READING, tags: ['Blog', 'Reading'] },
  'dev.to': { folderId: FOLDER_READING, tags: ['Dev', 'Articles'] },
  'hashnode.dev': { folderId: FOLDER_READING, tags: ['Blog', 'Tech'] },
  'techcrunch.com': { folderId: FOLDER_READING, tags: ['Tech', 'News'] },
  'news.ycombinator.com': { folderId: FOLDER_READING, tags: ['HackerNews', 'Tech'] },
  'theverge.com': { folderId: FOLDER_READING, tags: ['Tech', 'News'] },
  'wired.com': { folderId: FOLDER_READING, tags: ['Tech', 'Reading'] },
  'bloomberg.com': { folderId: FOLDER_READING, tags: ['News', 'Finance'] },
  'nytimes.com': { folderId: FOLDER_READING, tags: ['News'] },
  'wsj.com': { folderId: FOLDER_READING, tags: ['News', 'Business'] },
  'nature.com': { folderId: FOLDER_READING, tags: ['Science', 'Research'] },
  'sciencedirect.com': { folderId: FOLDER_READING, tags: ['Research', 'Papers'] },
  'scholar.google.com': { folderId: FOLDER_READING, tags: ['Research', 'Papers'] },
  'pocket.com': { folderId: FOLDER_READING, tags: ['Reading', 'Articles'] },
  'getpocket.com': { folderId: FOLDER_READING, tags: ['Reading'] },
  'goodreads.com': { folderId: FOLDER_READING, tags: ['Books', 'Reading'] },
  'wikipedia.org': { folderId: FOLDER_READING, tags: ['Reference', 'Knowledge'] },

  // Daily Tools & Bookmarks (AI, Mail, Calendar, Music, Utilities, Social)
  'chatgpt.com': { folderId: FOLDER_BOOKMARKS, tags: ['AI', 'Assistant'] },
  'chat.openai.com': { folderId: FOLDER_BOOKMARKS, tags: ['AI', 'Assistant'] },
  'claude.ai': { folderId: FOLDER_BOOKMARKS, tags: ['AI', 'Assistant'] },
  'gemini.google.com': { folderId: FOLDER_BOOKMARKS, tags: ['AI', 'Assistant'] },
  'perplexity.ai': { folderId: FOLDER_BOOKMARKS, tags: ['AI', 'Search'] },
  'spotify.com': { folderId: FOLDER_BOOKMARKS, tags: ['Music', 'Audio'] },
  'open.spotify.com': { folderId: FOLDER_BOOKMARKS, tags: ['Music', 'Focus'] },
  'youtube.com': { folderId: FOLDER_BOOKMARKS, tags: ['Video', 'Media'] },
  'music.youtube.com': { folderId: FOLDER_BOOKMARKS, tags: ['Music'] },
  'mail.google.com': { folderId: FOLDER_BOOKMARKS, tags: ['Mail', 'Google'] },
  'calendar.google.com': { folderId: FOLDER_BOOKMARKS, tags: ['Calendar', 'Schedule'] },
  'drive.google.com': { folderId: FOLDER_BOOKMARKS, tags: ['Cloud', 'GoogleDrive'] },
  'outlook.live.com': { folderId: FOLDER_BOOKMARKS, tags: ['Mail', 'Microsoft'] },
  'outlook.office.com': { folderId: FOLDER_BOOKMARKS, tags: ['Mail', 'Work'] },
  'twitter.com': { folderId: FOLDER_BOOKMARKS, tags: ['Social'] },
  'x.com': { folderId: FOLDER_BOOKMARKS, tags: ['Social'] },
  'reddit.com': { folderId: FOLDER_BOOKMARKS, tags: ['Community'] },
  '1password.com': { folderId: FOLDER_BOOKMARKS, tags: ['Utility', 'Security'] },
  'bitwarden.com': { folderId: FOLDER_BOOKMARKS, tags: ['Utility', 'Security'] },
};

/**
 * Keyword rules for title, URL path, and text token inspection.
 */
export const DEFAULT_KEYWORD_CATEGORY_RULES: Array<{
  keyword: string;
  folderId: string;
  tag: string;
}> = [
  // Classes & Studies keywords
  { keyword: 'syllabus', folderId: FOLDER_CLASSES, tag: 'Syllabus' },
  { keyword: 'lecture', folderId: FOLDER_CLASSES, tag: 'Lecture' },
  { keyword: 'homework', folderId: FOLDER_CLASSES, tag: 'Homework' },
  { keyword: 'assignment', folderId: FOLDER_CLASSES, tag: 'Assignment' },
  { keyword: 'course', folderId: FOLDER_CLASSES, tag: 'Course' },
  { keyword: 'curriculum', folderId: FOLDER_CLASSES, tag: 'Curriculum' },
  { keyword: 'textbook', folderId: FOLDER_CLASSES, tag: 'Textbook' },
  { keyword: 'exam', folderId: FOLDER_CLASSES, tag: 'Exam' },
  { keyword: 'midterm', folderId: FOLDER_CLASSES, tag: 'Exam' },
  { keyword: 'final exam', folderId: FOLDER_CLASSES, tag: 'Exam' },
  { keyword: 'quiz', folderId: FOLDER_CLASSES, tag: 'Quiz' },
  { keyword: 'blackboard', folderId: FOLDER_CLASSES, tag: 'School' },
  { keyword: 'canvas', folderId: FOLDER_CLASSES, tag: 'School' },
  { keyword: 'moodle', folderId: FOLDER_CLASSES, tag: 'School' },
  { keyword: 'classroom', folderId: FOLDER_CLASSES, tag: 'Classroom' },
  { keyword: 'open courseware', folderId: FOLDER_CLASSES, tag: 'Courses' },

  // Work & Projects keywords
  { keyword: 'pull request', folderId: FOLDER_WORK, tag: 'Git' },
  { keyword: 'pull-request', folderId: FOLDER_WORK, tag: 'Git' },
  { keyword: 'repository', folderId: FOLDER_WORK, tag: 'Dev' },
  { keyword: 'repo', folderId: FOLDER_WORK, tag: 'Dev' },
  { keyword: 'commit', folderId: FOLDER_WORK, tag: 'Git' },
  { keyword: 'jira', folderId: FOLDER_WORK, tag: 'Work' },
  { keyword: 'linear issue', folderId: FOLDER_WORK, tag: 'Work' },
  { keyword: 'sprint', folderId: FOLDER_WORK, tag: 'Agile' },
  { keyword: 'backlog', folderId: FOLDER_WORK, tag: 'Project' },
  { keyword: 'standup', folderId: FOLDER_WORK, tag: 'Work' },
  { keyword: 'dashboard', folderId: FOLDER_WORK, tag: 'Dashboard' },
  { keyword: 'analytics', folderId: FOLDER_WORK, tag: 'Analytics' },
  { keyword: 'api reference', folderId: FOLDER_WORK, tag: 'API' },
  { keyword: 'api documentation', folderId: FOLDER_WORK, tag: 'API' },
  { keyword: 'documentation', folderId: FOLDER_WORK, tag: 'Docs' },
  { keyword: 'docs', folderId: FOLDER_WORK, tag: 'Docs' },
  { keyword: 'figma file', folderId: FOLDER_WORK, tag: 'Design' },
  { keyword: 'wireframe', folderId: FOLDER_WORK, tag: 'Design' },
  { keyword: 'architecture', folderId: FOLDER_WORK, tag: 'Architecture' },
  { keyword: 'pulls', folderId: FOLDER_WORK, tag: 'Dev' },
  { keyword: 'graphql', folderId: FOLDER_WORK, tag: 'API' },
  { keyword: 'deploy', folderId: FOLDER_WORK, tag: 'DevOps' },
  { keyword: 'pipeline', folderId: FOLDER_WORK, tag: 'DevOps' },

  // Reading List keywords
  { keyword: 'paper', folderId: FOLDER_READING, tag: 'Papers' },
  { keyword: 'whitepaper', folderId: FOLDER_READING, tag: 'Whitepaper' },
  { keyword: 'newsletter', folderId: FOLDER_READING, tag: 'Newsletter' },
  { keyword: 'deep dive', folderId: FOLDER_READING, tag: 'Reading' },
  { keyword: 'article', folderId: FOLDER_READING, tag: 'Article' },
  { keyword: 'essay', folderId: FOLDER_READING, tag: 'Essay' },
  { keyword: 'blog post', folderId: FOLDER_READING, tag: 'Blog' },
  { keyword: 'post', folderId: FOLDER_READING, tag: 'Reading' },
  { keyword: 'read later', folderId: FOLDER_READING, tag: 'Reading' },
  { keyword: 'reading list', folderId: FOLDER_READING, tag: 'Reading' },
  { keyword: 'guide', folderId: FOLDER_READING, tag: 'Guide' },
  { keyword: 'tutorial', folderId: FOLDER_READING, tag: 'Tutorial' },
  { keyword: 'handbook', folderId: FOLDER_READING, tag: 'Guide' },
  { keyword: 'interview with', folderId: FOLDER_READING, tag: 'Interview' },

  // Daily Tools & Bookmarks keywords
  { keyword: 'calculator', folderId: FOLDER_BOOKMARKS, tag: 'Tool' },
  { keyword: 'converter', folderId: FOLDER_BOOKMARKS, tag: 'Tool' },
  { keyword: 'generator', folderId: FOLDER_BOOKMARKS, tag: 'Tool' },
  { keyword: 'playlist', folderId: FOLDER_BOOKMARKS, tag: 'Music' },
  { keyword: 'radio', folderId: FOLDER_BOOKMARKS, tag: 'Audio' },
  { keyword: 'weather', folderId: FOLDER_BOOKMARKS, tag: 'Utility' },
  { keyword: 'calendar', folderId: FOLDER_BOOKMARKS, tag: 'Calendar' },
  { keyword: 'inbox', folderId: FOLDER_BOOKMARKS, tag: 'Mail' },
  { keyword: 'mail', folderId: FOLDER_BOOKMARKS, tag: 'Mail' },
  { keyword: 'chatgpt', folderId: FOLDER_BOOKMARKS, tag: 'AI' },
  { keyword: 'claude', folderId: FOLDER_BOOKMARKS, tag: 'AI' },
  { keyword: 'assistant', folderId: FOLDER_BOOKMARKS, tag: 'AI' },
  { keyword: 'portal', folderId: FOLDER_BOOKMARKS, tag: 'Portal' },
];

/**
 * Browser folder name heuristic patterns.
 */
const FOLDER_NAME_PATTERNS: Array<{
  regex: RegExp;
  folderId: string;
  tag: string;
}> = [
  { regex: /(school|class|study|college|univ|course|lecture|homework|academ)/i, folderId: FOLDER_CLASSES, tag: 'School' },
  { regex: /(work|project|code|dev|repo|linear|jira|client|office|company)/i, folderId: FOLDER_WORK, tag: 'Work' },
  { regex: /(read|article|paper|book|essay|blog|news|newsletter|later)/i, folderId: FOLDER_READING, tag: 'Reading' },
  { regex: /(tool|daily|util|misc|general|fav|music|social|bookmark)/i, folderId: FOLDER_BOOKMARKS, tag: 'Tools' },
];

/**
 * Safely extracts hostname from a given URL string.
 */
export function extractHostname(url: string): string {
  if (!url || typeof url !== 'string') return '';
  try {
    const parsed = new URL(url.trim());
    return parsed.hostname.toLowerCase();
  } catch {
    // Fallback for missing protocol (e.g., "github.com/org/repo")
    try {
      const parsedWithProto = new URL(`https://${url.trim()}`);
      return parsedWithProto.hostname.toLowerCase();
    } catch {
      return '';
    }
  }
}

/**
 * Determines if availableFolders contains a folder with the given ID.
 * Falls back to available folders if target ID isn't found.
 */
function resolveFolderId(targetFolderId: string, availableFolders?: Folder[]): string {
  if (!availableFolders || availableFolders.length === 0) {
    return targetFolderId;
  }
  const match = availableFolders.find(f => f.id === targetFolderId);
  if (match) return match.id;
  // If target folder does not exist, return the first available folder
  return availableFolders[0].id;
}

/**
 * Deterministically classifies a bookmark based on folder heuristics,
 * known domains, TLD rules, and keyword tokens.
 *
 * Runs client-side in under a fraction of a millisecond.
 */
export function classifyBookmark(
  url: string,
  title?: string,
  sourceFolder?: string,
  availableFolders?: Folder[]
): BookmarkClassificationResult {
  const cleanUrl = (url || '').trim();
  const cleanTitle = (title || '').trim();
  const cleanSourceFolder = (sourceFolder || '').trim();
  const hostname = extractHostname(cleanUrl);

  const tags = new Set<string>();

  // 1. Browser Folder Heuristics (if user already had structured folders in browser)
  if (cleanSourceFolder) {
    for (const pattern of FOLDER_NAME_PATTERNS) {
      if (pattern.regex.test(cleanSourceFolder)) {
        tags.add(pattern.tag);
        return {
          folderId: resolveFolderId(pattern.folderId, availableFolders),
          tags: Array.from(tags),
          matchedRule: `Folder match: "${cleanSourceFolder}"`,
          confidence: 'high' as BookmarkClassificationConfidence,
        };
      }
    }
  }

  // 2. High-Confidence Domain Exact & Suffix Matching
  if (hostname) {
    // Check exact domain
    if (DEFAULT_DOMAIN_CATEGORY_RULES[hostname]) {
      const rule = DEFAULT_DOMAIN_CATEGORY_RULES[hostname];
      rule.tags.forEach(t => tags.add(t));
      return {
        folderId: resolveFolderId(rule.folderId, availableFolders),
        tags: Array.from(tags),
        matchedRule: `Domain rule: ${hostname}`,
        confidence: 'high' as BookmarkClassificationConfidence,
      };
    }

    // Check suffix matching (e.g. sub.github.com -> github.com)
    for (const [ruleDomain, rule] of Object.entries(DEFAULT_DOMAIN_CATEGORY_RULES)) {
      if (hostname.endsWith(`.${ruleDomain}`)) {
        rule.tags.forEach(t => tags.add(t));
        return {
          folderId: resolveFolderId(rule.folderId, availableFolders),
          tags: Array.from(tags),
          matchedRule: `Domain suffix: *.${ruleDomain}`,
          confidence: 'high' as BookmarkClassificationConfidence,
        };
      }
    }

    // Academic TLD rule: .edu or .ac.uk -> folder-classes
    if (hostname.endsWith('.edu') || hostname.endsWith('.ac.uk') || hostname.endsWith('.edu.cn') || hostname.endsWith('.edu.au')) {
      tags.add('Academic');
      tags.add('Study');
      return {
        folderId: resolveFolderId(FOLDER_CLASSES, availableFolders),
        tags: Array.from(tags),
        matchedRule: 'Academic TLD rule (.edu / .ac)',
        confidence: 'high' as BookmarkClassificationConfidence,
      };
    }

    // Localhost / internal dev IP -> folder-work
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.') || hostname.endsWith('.local') || hostname.endsWith('.internal')) {
      tags.add('LocalDev');
      tags.add('Dev');
      return {
        folderId: resolveFolderId(FOLDER_WORK, availableFolders),
        tags: Array.from(tags),
        matchedRule: 'Localhost / Internal Dev Hostname',
        confidence: 'high' as BookmarkClassificationConfidence,
      };
    }
  }

  // 3. Keyword & Path Analysis on Title and URL
  const searchCorpus = `${cleanTitle} ${cleanUrl}`.toLowerCase();

  for (const rule of DEFAULT_KEYWORD_CATEGORY_RULES) {
    if (searchCorpus.includes(rule.keyword.toLowerCase())) {
      tags.add(rule.tag);
      return {
        folderId: resolveFolderId(rule.folderId, availableFolders),
        tags: Array.from(tags),
        matchedRule: `Keyword match: "${rule.keyword}"`,
        confidence: 'medium' as BookmarkClassificationConfidence,
      };
    }
  }

  // 4. Fallback Default: Daily Tools & Bookmarks
  tags.add('Bookmarks');
  return {
    folderId: resolveFolderId(FOLDER_BOOKMARKS, availableFolders),
    tags: Array.from(tags),
    matchedRule: 'Default fallback rule',
    confidence: 'low' as BookmarkClassificationConfidence,
  };
}
