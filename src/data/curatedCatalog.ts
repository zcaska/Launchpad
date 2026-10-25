import { RecommendationCandidate } from '../types';

export const CURATED_FOCUS_SUGGESTIONS: RecommendationCandidate[] = [
  {
    "id": "sug-hacker-news",
    "title": "Hacker News: High-Signal Tech & Essays",
    "url": "https://news.ycombinator.com",
    "kind": "web",
    "category": "Technology",
    "description": "Select an insightful engineering retrospective, computer science discussion, or deep essay.",
    "tags": [
      "Tech",
      "Engineering",
      "Essays",
      "Reading"
    ],
    "durationEstimateMinutes": 15,
    "sourceType": "curated_web",
    "rationale": "Curated developer discussions and thought-provoking technology perspectives."
  },
  {
    "id": "sug-lobsters",
    "title": "Lobste.rs: Computing, Architecture & Systems",
    "url": "https://lobste.rs",
    "kind": "web",
    "category": "Engineering",
    "description": "Explore focused technical conversations on programming languages, kernel internals, and architectures.",
    "tags": [
      "Tech",
      "Engineering",
      "Architecture",
      "Reading"
    ],
    "durationEstimateMinutes": 15,
    "sourceType": "curated_web",
    "rationale": "High-signal technical forum strictly anchored on computing craft without noise."
  },
  {
    "id": "sug-sys-design",
    "title": "System Design Primer: Scalability & Architecture",
    "url": "https://github.com/donnemartin/system-design-primer",
    "kind": "web",
    "category": "Engineering",
    "description": "Quick 15-minute read on scalability patterns, CAP theorem, and distributed cache strategies.",
    "tags": [
      "Architecture",
      "Engineering",
      "Tech",
      "Systems"
    ],
    "durationEstimateMinutes": 15,
    "sourceType": "curated_web",
    "rationale": "Sharpen backend architecture intuition and system trade-offs."
  },
  {
    "id": "sug-refactoring-guru",
    "title": "Refactoring Guru: Design Patterns & Clean Code",
    "url": "https://refactoring.guru/design-patterns",
    "kind": "web",
    "category": "Engineering",
    "description": "Review one structural or behavioral design pattern (Strategy, Observer, Adapter) and identify where it applies.",
    "tags": [
      "Engineering",
      "Architecture",
      "Code",
      "Design Patterns"
    ],
    "durationEstimateMinutes": 15,
    "sourceType": "curated_web",
    "rationale": "Build muscle memory for clean, maintainable software abstractions."
  },
  {
    "id": "sug-dan-luu",
    "title": "Dan Luu: Hard Evidence & Systems Engineering",
    "url": "https://danluu.com",
    "kind": "web",
    "category": "Engineering",
    "description": "Empirical investigations into hardware latency, software bloat, and system reliability.",
    "tags": [
      "Engineering",
      "Systems",
      "Hardware",
      "Essays"
    ],
    "durationEstimateMinutes": 20,
    "sourceType": "curated_web",
    "rationale": "Grounded, data-driven engineering critiques free of marketing hype."
  },
  {
    "id": "sug-paul-graham",
    "title": "Paul Graham Essays: Startups & Ambition",
    "url": "https://paulgraham.com/articles.html",
    "kind": "web",
    "category": "Wisdom",
    "description": "Timeless essays on doing great work, maker schedules, independent mindedness, and taste.",
    "tags": [
      "Wisdom",
      "Essays",
      "Reading",
      "Philosophy"
    ],
    "durationEstimateMinutes": 15,
    "sourceType": "curated_web",
    "rationale": "Classic philosophical clarity on creative output, focus, and intellectual independence."
  },
  {
    "id": "sug-martin-fowler",
    "title": "Martin Fowler: Software Architecture & Patterns",
    "url": "https://martinfowler.com/bliki",
    "kind": "web",
    "category": "Architecture",
    "description": "Insightful bliki entries exploring microservices, domain logic, testing pyramids, and refactoring.",
    "tags": [
      "Architecture",
      "Engineering",
      "Code",
      "Reading"
    ],
    "durationEstimateMinutes": 15,
    "sourceType": "curated_web",
    "rationale": "Master the architectural foundations of enterprise software systems."
  },
  {
    "id": "sug-pragmatic-engineer",
    "title": "The Pragmatic Engineer: Big Tech Engineering",
    "url": "https://newsletter.pragmaticengineer.com",
    "kind": "web",
    "category": "Engineering",
    "description": "In-depth perspectives on software engineering leadership, tech stacks, and career craft.",
    "tags": [
      "Engineering",
      "Tech",
      "Essays"
    ],
    "durationEstimateMinutes": 15,
    "sourceType": "curated_web",
    "rationale": "Practical insider knowledge of modern tech industry practices."
  },
  {
    "id": "sug-julia-evans",
    "title": "Julia Evans: Linux, Networking & Zines",
    "url": "https://jvns.ca",
    "kind": "web",
    "category": "Engineering",
    "description": "Delightful, crystalline visual explanations of DNS, Git internals, bash, and kernel primitives.",
    "tags": [
      "Engineering",
      "Tech",
      "Systems",
      "Code"
    ],
    "durationEstimateMinutes": 10,
    "sourceType": "curated_web",
    "rationale": "Demystify underlying operating system mechanics with playful, sharp curiosity."
  },
  {
    "id": "sug-github-trending",
    "title": "GitHub Trending: Open Source Innovations",
    "url": "https://github.com/trending",
    "kind": "web",
    "category": "Technology",
    "description": "Discover trending open-source repositories, developer tools, and cutting-edge libraries.",
    "tags": [
      "Tech",
      "Code",
      "Tools",
      "Engineering"
    ],
    "durationEstimateMinutes": 10,
    "sourceType": "curated_web",
    "rationale": "Explore fresh architectural approaches and global open-source creativity."
  },
  {
    "id": "sug-roadmap-sh",
    "title": "Roadmap.sh: Developer Growth Roadmaps",
    "url": "https://roadmap.sh",
    "kind": "web",
    "category": "Engineering",
    "description": "Visual roadmaps for backend, frontend, DevOps, system design, and AI engineering skills.",
    "tags": [
      "Engineering",
      "Learning",
      "Architecture"
    ],
    "durationEstimateMinutes": 15,
    "sourceType": "curated_web",
    "rationale": "Structured visual curricula to fill architectural knowledge gaps."
  },
  {
    "id": "sug-devdocs",
    "title": "DevDocs: Unified API Documentation",
    "url": "https://devdocs.io",
    "kind": "web",
    "category": "Technology",
    "description": "Instant, fast documentation browser for web APIs, languages, and frameworks in one clean UI.",
    "tags": [
      "Tech",
      "Tools",
      "Code"
    ],
    "durationEstimateMinutes": 10,
    "sourceType": "curated_web",
    "rationale": "Deep dive into an unfamiliar standard library API without browser clutter."
  },
  {
    "id": "sug-mynoise",
    "title": "myNoise: Custom Acoustic Soundscapes & White Noise",
    "url": "https://mynoise.net",
    "kind": "web",
    "category": "Focus",
    "description": "Tune high-quality sound generators: rain on a tent, Japanese garden, binaural beats, and caf\u00e9 murmur.",
    "tags": [
      "Focus",
      "Audio",
      "Flow",
      "Deep Work"
    ],
    "durationEstimateMinutes": 30,
    "sourceType": "curated_web",
    "rationale": "Acoustic background frequency isolation designed to mask cognitive speech distractions."
  },
  {
    "id": "sug-coffitivity",
    "title": "Coffitivity: Ambient Caf\u00e9 Murmur",
    "url": "https://coffitivity.com",
    "kind": "web",
    "category": "Focus",
    "description": "Proven ambient sounds of a bustling coffee shop to boost creative thinking and focus.",
    "tags": [
      "Focus",
      "Audio",
      "Flow"
    ],
    "durationEstimateMinutes": 25,
    "sourceType": "curated_web",
    "rationale": "Mild environmental sound shown in peer-reviewed studies to promote abstract thinking."
  },
  {
    "id": "sug-brain-fm",
    "title": "Brain.fm: Science-Backed Focus Music",
    "url": "https://brain.fm",
    "kind": "web",
    "category": "Focus",
    "description": "Neural phase-locking auditory stimulation designed to help hold attention without fatigue.",
    "tags": [
      "Focus",
      "Audio",
      "Flow",
      "Deep Work"
    ],
    "durationEstimateMinutes": 30,
    "sourceType": "curated_web",
    "rationale": "Music synthesized specifically to guide brainwaves into high-focus flow states."
  },
  {
    "id": "sug-lofigirl",
    "title": "Lofi Girl: Relax & Focus Stream",
    "url": "https://lofigirl.com",
    "kind": "web",
    "category": "Focus",
    "description": "Non-distracting, warm instrumental beat tape to accompany intense coding or reading sessions.",
    "tags": [
      "Focus",
      "Audio",
      "Flow"
    ],
    "durationEstimateMinutes": 30,
    "sourceType": "curated_web",
    "rationale": "Consistent, peaceful rhythmic tempo that reduces restlessness."
  },
  {
    "id": "sug-matt-levine",
    "title": "Bloomberg: Matt Levine's Money Stuff",
    "url": "https://www.bloomberg.com/opinion/authors/ARbTQlRLRjE/matthew-s-levine",
    "kind": "web",
    "category": "Finance",
    "description": "The sharpest, wittiest daily breakdown of high finance, derivatives, dealmaking, and market absurdities.",
    "tags": [
      "Finance",
      "Markets",
      "Wall Street",
      "Reading",
      "Economics"
    ],
    "durationEstimateMinutes": 15,
    "sourceType": "curated_web",
    "rationale": "Learn market microstructure, capital allocation, and legal subtleties through legendary financial commentary."
  },
  {
    "id": "sug-damodaran",
    "title": "Musings on Markets by Prof. Aswath Damodaran",
    "url": "https://aswathdamodaran.blogspot.com",
    "kind": "web",
    "category": "Finance",
    "description": "NYU Stern's valuation dean deconstructs corporate finance, cost of capital, and equity valuation.",
    "tags": [
      "Finance",
      "Valuation",
      "Investing",
      "Economics"
    ],
    "durationEstimateMinutes": 20,
    "sourceType": "curated_web",
    "rationale": "Demystify DCF models, market narratives, and intrinsic value versus market price."
  },
  {
    "id": "sug-howard-marks",
    "title": "Oaktree Capital Memos by Howard Marks",
    "url": "https://www.oaktreecapital.com/insights/memos",
    "kind": "web",
    "category": "Finance",
    "description": "Masterclasses in second-order thinking, market cycles, risk asymmetry, and credit psychology.",
    "tags": [
      "Finance",
      "Investing",
      "Wisdom",
      "Risk"
    ],
    "durationEstimateMinutes": 20,
    "sourceType": "curated_web",
    "rationale": "Absorb timeless investing wisdom on surviving downturns and understanding herd behavior."
  },
  {
    "id": "sug-ft-alphaville",
    "title": "Financial Times: FT Alphaville",
    "url": "https://www.ft.com/alphaville",
    "kind": "web",
    "category": "Finance",
    "description": "Unvarnished financial journalism, investigative balance sheet sleuthing, and macro market critique.",
    "tags": [
      "Finance",
      "Journalism",
      "Markets",
      "Reading"
    ],
    "durationEstimateMinutes": 15,
    "sourceType": "curated_web",
    "rationale": "Deep financial literacy and skeptical balance-sheet scrutiny without PR spin."
  },
  {
    "id": "sug-abnormal-returns",
    "title": "Abnormal Returns: Curated Investment Forecast",
    "url": "https://abnormalreturns.com",
    "kind": "web",
    "category": "Finance",
    "description": "The premier daily index of the best market whitepapers, asset allocation blogs, and economic analyses.",
    "tags": [
      "Finance",
      "Investing",
      "Curation",
      "Markets"
    ],
    "durationEstimateMinutes": 10,
    "sourceType": "curated_web",
    "rationale": "High-signal filter of the best investing thinkers across the global web."
  },
  {
    "id": "sug-visual-capitalist",
    "title": "Visual Capitalist: Global Markets & Macro Trends",
    "url": "https://www.visualcapitalist.com",
    "kind": "web",
    "category": "Finance",
    "description": "Rich data-driven infographics depicting sovereign debt, commodity supplies, technology trends, and wealth.",
    "tags": [
      "Finance",
      "Data",
      "Infographics",
      "Economics"
    ],
    "durationEstimateMinutes": 10,
    "sourceType": "curated_web",
    "rationale": "Grasp complex global economic scale and asset distributions through intuitive visual synthesis."
  },
  {
    "id": "sug-investopedia-academy",
    "title": "Investopedia: Advanced Financial Concepts",
    "url": "https://www.investopedia.com/financial-term-dictionary-4769738",
    "kind": "web",
    "category": "Finance",
    "description": "Study one fundamental financial instrument: bonds, options Greeks, capital adequacy ratios, or liquidity pools.",
    "tags": [
      "Finance",
      "Education",
      "Markets"
    ],
    "durationEstimateMinutes": 15,
    "sourceType": "curated_web",
    "rationale": "Build enduring foundational literacy in market mechanisms and personal capital mastery."
  },
  {
    "id": "sug-cliff-asness",
    "title": "AQR Capital Insights: Factor Investing & Quants",
    "url": "https://www.aqr.com/Insights/Perspectives",
    "kind": "web",
    "category": "Finance",
    "description": "Rigorous quantitative finance essays on value versus momentum, statistical arbitrage, and factor risk.",
    "tags": [
      "Finance",
      "Quantitative",
      "Investing",
      "Research"
    ],
    "durationEstimateMinutes": 20,
    "sourceType": "curated_web",
    "rationale": "Understand institutional quant finance, statistical significance, and hedge fund mechanics."
  },
  {
    "id": "sug-collab-fund",
    "title": "Collaborative Fund: Morgan Housel Essays",
    "url": "https://collabfund.com/blog",
    "kind": "web",
    "category": "Finance",
    "description": "The Psychology of Money author explores risk, compounding, history, and human behavior.",
    "tags": [
      "Finance",
      "Psychology",
      "Essays",
      "Wisdom"
    ],
    "durationEstimateMinutes": 15,
    "sourceType": "curated_web",
    "rationale": "Gain composure and emotional clarity around wealth, expectations, and long horizons."
  },
  {
    "id": "sug-kellogg-finance",
    "title": "Kellogg Insight: Corporate Finance & Capital",
    "url": "https://insight.kellogg.northwestern.edu/topic/finance",
    "kind": "web",
    "category": "Finance",
    "description": "Northwestern Kellogg research on credit spreads, venture capital returns, and executive incentives.",
    "tags": [
      "Finance",
      "Academia",
      "Research",
      "Corporate"
    ],
    "durationEstimateMinutes": 15,
    "sourceType": "curated_web",
    "rationale": "Peer-reviewed insights into corporate governance and financial decision making."
  },
  {
    "id": "sug-wsj-markets",
    "title": "Wall Street Journal: Markets & Global Economy",
    "url": "https://www.wsj.com/news/markets",
    "kind": "web",
    "category": "Finance",
    "description": "Authoritative reporting on sovereign debt, foreign exchange movements, and central bank directives.",
    "tags": [
      "Finance",
      "Markets",
      "News",
      "Economics"
    ],
    "durationEstimateMinutes": 15,
    "sourceType": "curated_web",
    "rationale": "Track real-world macro liquidity flows and institutional sentiment."
  },
  {
    "id": "sug-the-economist-finance",
    "title": "The Economist: Finance & Economics Section",
    "url": "https://www.economist.com/finance-and-economics",
    "kind": "web",
    "category": "Finance",
    "description": "Global perspectives on interest rate policy, emerging market debt, and sovereign balance sheets.",
    "tags": [
      "Finance",
      "Economics",
      "Global",
      "Reading"
    ],
    "durationEstimateMinutes": 20,
    "sourceType": "curated_web",
    "rationale": "Nuanced macroeconomic analysis examining fiscal regimes across continents."
  },
  {
    "id": "sug-barrons",
    "title": "Barron's Market Insights & Roundtables",
    "url": "https://www.barrons.com",
    "kind": "web",
    "category": "Finance",
    "description": "Seasoned asset managers debate equity valuations, fixed income yields, and sector rotations.",
    "tags": [
      "Finance",
      "Markets",
      "Investing"
    ],
    "durationEstimateMinutes": 15,
    "sourceType": "curated_web",
    "rationale": "Learn how veteran money managers assess cyclical vs secular trends."
  },
  {
    "id": "sug-macro-compass",
    "title": "The Macro Compass: Global Liquidity Cycles",
    "url": "https://themacrocompass.substack.com",
    "kind": "web",
    "category": "Finance",
    "description": "Deep dives into bond market yields, repo facilities, credit impulses, and central bank balance sheets.",
    "tags": [
      "Finance",
      "Macro",
      "Economics",
      "Bonds"
    ],
    "durationEstimateMinutes": 20,
    "sourceType": "curated_web",
    "rationale": "Understand the plumbing of global fiat liquidity and interest rate regimes."
  },
  {
    "id": "sug-lyn-alden",
    "title": "Lyn Alden: Macro Research & Capital Trends",
    "url": "https://www.lynalden.com",
    "kind": "web",
    "category": "Finance",
    "description": "Engineering-grounded macroeconomic reports on energy grids, fiscal deficits, and monetary history.",
    "tags": [
      "Finance",
      "Macro",
      "Investing",
      "Research"
    ],
    "durationEstimateMinutes": 25,
    "sourceType": "curated_web",
    "rationale": "Clear, long-horizon fundamental research connecting energy, currencies, and balance sheets."
  },
  {
    "id": "sug-finviz",
    "title": "Finviz: Global Financial Performance Maps",
    "url": "https://finviz.com/map.ashx",
    "kind": "web",
    "category": "Finance",
    "description": "Interactive heatmaps of equities, sectors, valuations, and global market capitalizations.",
    "tags": [
      "Finance",
      "Markets",
      "Visualization",
      "Data"
    ],
    "durationEstimateMinutes": 5,
    "sourceType": "curated_web",
    "rationale": "Gain instantaneous visual orientation of global sector breadth and daily momentum."
  },
  {
    "id": "sug-marginal-revolution",
    "title": "Marginal Revolution: Economics & Trade-Offs",
    "url": "https://marginalrevolution.com",
    "kind": "web",
    "category": "Economics",
    "description": "Tyler Cowen & Alex Tabarrok apply economic principles to culture, AI, incentives, and policy.",
    "tags": [
      "Economics",
      "Incentives",
      "Policy",
      "Reading"
    ],
    "durationEstimateMinutes": 15,
    "sourceType": "curated_web",
    "rationale": "Train intuition in opportunity cost, comparative advantage, and unexpected incentives."
  },
  {
    "id": "sug-voxeu",
    "title": "VoxEU / CEPR: Research-Based Policy Analysis",
    "url": "https://cepr.org/voxeu",
    "kind": "web",
    "category": "Economics",
    "description": "Top academic economists communicate rigorous research on inflation, productivity, and trade.",
    "tags": [
      "Economics",
      "Research",
      "Policy",
      "Academia"
    ],
    "durationEstimateMinutes": 15,
    "sourceType": "curated_web",
    "rationale": "Bypass political punditry with peer-reviewed empirical economic evidence."
  },
  {
    "id": "sug-nber",
    "title": "NBER: National Bureau of Economic Research",
    "url": "https://www.nber.org/papers",
    "kind": "web",
    "category": "Economics",
    "description": "The frontier of macroeconomic, labor, and healthcare policy working papers.",
    "tags": [
      "Economics",
      "Research",
      "Papers",
      "Policy"
    ],
    "durationEstimateMinutes": 20,
    "sourceType": "curated_web",
    "rationale": "Read the actual working papers that shape central bank policy and legislation."
  },
  {
    "id": "sug-project-syndicate-econ",
    "title": "Project Syndicate: World Economics Commentary",
    "url": "https://www.project-syndicate.org/economics",
    "kind": "web",
    "category": "Economics",
    "description": "Essays from Nobel laureates, policymakers, and civic leaders on global economic architecture.",
    "tags": [
      "Economics",
      "Global",
      "Policy",
      "Essays"
    ],
    "durationEstimateMinutes": 15,
    "sourceType": "curated_web",
    "rationale": "Direct intellectual debates from leaders shaping international trade and currency."
  },
  {
    "id": "sug-conversable-economist",
    "title": "The Conversable Economist by Timothy Taylor",
    "url": "https://conversableeconomist.com",
    "kind": "web",
    "category": "Economics",
    "description": "Managing editor of the Journal of Economic Perspectives curates lucid essays on trade and labor.",
    "tags": [
      "Economics",
      "Essays",
      "Reading",
      "Incentives"
    ],
    "durationEstimateMinutes": 15,
    "sourceType": "curated_web",
    "rationale": "Exceptional clarity translating complex economic journals into engaging insights."
  },
  {
    "id": "sug-core-econ",
    "title": "CORE Econ: The Economy for a Changing World",
    "url": "https://www.core-econ.org",
    "kind": "web",
    "category": "Economics",
    "description": "Modern, open-access economics curriculum grounded in inequality, climate, and real empirics.",
    "tags": [
      "Economics",
      "Education",
      "Courseware"
    ],
    "durationEstimateMinutes": 20,
    "sourceType": "curated_web",
    "rationale": "Re-learn economics through modern empirics rather than 1950s chalk-and-talk models."
  },
  {
    "id": "sug-imf-f-and-d",
    "title": "IMF: Finance & Development Magazine",
    "url": "https://www.imf.org/en/Publications/fandd",
    "kind": "web",
    "category": "Economics",
    "description": "Quarterly explorations into international development, currency pegs, and capital account mobility.",
    "tags": [
      "Economics",
      "Global",
      "Development",
      "Policy"
    ],
    "durationEstimateMinutes": 20,
    "sourceType": "curated_web",
    "rationale": "Broaden worldview with perspectives on developing world monetary and social dynamics."
  },
  {
    "id": "sug-piie",
    "title": "Peterson Institute for International Economics",
    "url": "https://www.piie.com",
    "kind": "web",
    "category": "Economics",
    "description": "Nonpartisan research on global tariffs, supply chain decoupling, and trade agreements.",
    "tags": [
      "Economics",
      "Trade",
      "Policy",
      "Geopolitics"
    ],
    "durationEstimateMinutes": 15,
    "sourceType": "curated_web",
    "rationale": "Objective analysis of trade barriers, sanctions, and multinational industrial policy."
  },
  {
    "id": "sug-st-louis-fred",
    "title": "St. Louis Fed: FRED Economic Data Blog",
    "url": "https://fredblog.stlouisfed.org",
    "kind": "web",
    "category": "Economics",
    "description": "Fascinating data stories decoding employment rates, M2 velocity, productivity, and yield curves.",
    "tags": [
      "Economics",
      "Data",
      "Federal Reserve",
      "Research"
    ],
    "durationEstimateMinutes": 10,
    "sourceType": "curated_web",
    "rationale": "Learn how to ask questions and find answers in primary central bank data series."
  },
  {
    "id": "sug-oecd-insights",
    "title": "OECD: Global Economic Outlook & Analysis",
    "url": "https://www.oecd.org/en/topics/economic-outlook.html",
    "kind": "web",
    "category": "Economics",
    "description": "Comprehensive comparative cross-national metrics on educational attainment, tax, and GDP.",
    "tags": [
      "Economics",
      "Policy",
      "Global",
      "Data"
    ],
    "durationEstimateMinutes": 15,
    "sourceType": "curated_web",
    "rationale": "Examine how social and economic safety nets operate across 38 advanced democracies."
  },
  {
    "id": "sug-center-equitable-growth",
    "title": "Equitable Growth: Inequality & Macro Evidence",
    "url": "https://equitablegrowth.org",
    "kind": "web",
    "category": "Economics",
    "description": "Empirical studies investigating how wealth concentration impacts aggregate consumer demand and innovation.",
    "tags": [
      "Economics",
      "Policy",
      "Research",
      "Society"
    ],
    "durationEstimateMinutes": 15,
    "sourceType": "curated_web",
    "rationale": "Understand modern research connecting economic fairness to long-run productivity."
  },
  {
    "id": "sug-krugman-substack",
    "title": "Paul Krugman: Macro & International Trade",
    "url": "https://paulkrugman.substack.com",
    "kind": "web",
    "category": "Economics",
    "description": "Nobel laureate in economic geography analyzes fiscal stimulus, inflation models, and trade flows.",
    "tags": [
      "Economics",
      "Trade",
      "Macro",
      "Essays"
    ],
    "durationEstimateMinutes": 15,
    "sourceType": "curated_web",
    "rationale": "Clear exposition of economic concepts from a founder of New Trade Theory."
  },
  {
    "id": "sug-tax-foundation",
    "title": "Tax Foundation: Global Tax Policy Research",
    "url": "https://taxfoundation.org/research",
    "kind": "web",
    "category": "Economics",
    "description": "Comparative studies on corporate tax rates, capital depreciation rules, and fiscal incidence.",
    "tags": [
      "Economics",
      "Tax",
      "Policy",
      "Research"
    ],
    "durationEstimateMinutes": 15,
    "sourceType": "curated_web",
    "rationale": "Learn how tax codes shape capital investment, entrepreneurship, and talent migration."
  },
  {
    "id": "sug-world-bank-open",
    "title": "World Bank: Open Knowledge Repository",
    "url": "https://openknowledge.worldbank.org",
    "kind": "web",
    "category": "Economics",
    "description": "Primary research documenting poverty reduction, water security, and rural electrification.",
    "tags": [
      "Economics",
      "Development",
      "Global",
      "Poverty"
    ],
    "durationEstimateMinutes": 20,
    "sourceType": "curated_web",
    "rationale": "Grounding global perspective on what successfully compounds human welfare."
  },
  {
    "id": "sug-noahpinion",
    "title": "Noahpinion: Industrial Policy & Economics",
    "url": "https://www.noahpinion.blog",
    "kind": "web",
    "category": "Economics",
    "description": "Noah Smith's essays on green re-industrialization, demographics, immigration, and semiconductors.",
    "tags": [
      "Economics",
      "Industry",
      "Technology",
      "Essays"
    ],
    "durationEstimateMinutes": 15,
    "sourceType": "curated_web",
    "rationale": "Energetic, data-backed synthesis of geopolitics, manufacturing, and macroeconomics."
  },
  {
    "id": "sug-propublica",
    "title": "ProPublica: Investigative Journalism in Public Interest",
    "url": "https://www.propublica.org",
    "kind": "web",
    "category": "Journalism",
    "description": "Pulitzer-winning investigative deep dives exposing corporate wrongdoing, judicial corruption, and health malfeasance.",
    "tags": [
      "Journalism",
      "Investigative",
      "Society",
      "Reading"
    ],
    "durationEstimateMinutes": 20,
    "sourceType": "curated_web",
    "rationale": "The gold standard of non-profit public interest journalism holding power accountable."
  },
  {
    "id": "sug-reuters-investigates",
    "title": "Reuters Investigates & Visual Graphics",
    "url": "https://www.reuters.com/investigates",
    "kind": "web",
    "category": "Journalism",
    "description": "Rigorous, impartial global investigative reporting paired with world-class interactive data storytelling.",
    "tags": [
      "Journalism",
      "Global",
      "Data",
      "Investigative"
    ],
    "durationEstimateMinutes": 15,
    "sourceType": "curated_web",
    "rationale": "Unbiased, deeply sourced global reporting free from inflammatory clickbait."
  },
  {
    "id": "sug-rest-of-world",
    "title": "Rest of World: Tech & Life Beyond the West",
    "url": "https://restofworld.org",
    "kind": "web",
    "category": "Journalism",
    "description": "Ground-level human reporting on how digital infrastructure, labor, and hardware transform the Global South.",
    "tags": [
      "Journalism",
      "Tech",
      "Global",
      "Society"
    ],
    "durationEstimateMinutes": 15,
    "sourceType": "curated_web",
    "rationale": "Break out of the Silicon Valley bubble to see how billions actually experience technology."
  },
  {
    "id": "sug-the-atlantic-long",
    "title": "The Atlantic: Ideas & Longform Essays",
    "url": "https://www.theatlantic.com/ideas",
    "kind": "web",
    "category": "Journalism",
    "description": "Thoughtful cultural criticism, political philosophy, and narrative essays challenging conventional wisdom.",
    "tags": [
      "Journalism",
      "Essays",
      "Culture",
      "Reading"
    ],
    "durationEstimateMinutes": 20,
    "sourceType": "curated_web",
    "rationale": "Engage with nuanced arguments exploring the tensions in modern society."
  },
  {
    "id": "sug-semafor",
    "title": "Semafor: Transparent & Direct Global Reporting",
    "url": "https://www.semafor.com",
    "kind": "web",
    "category": "Journalism",
    "description": "Direct, segmented journalism that clearly demarcates the facts, the reporter's view, and counterarguments.",
    "tags": [
      "Journalism",
      "News",
      "Global"
    ],
    "durationEstimateMinutes": 10,
    "sourceType": "curated_web",
    "rationale": "Efficient news consumption designed to eliminate emotional manipulation and opacity."
  },
  {
    "id": "sug-the-guardian-longread",
    "title": "The Guardian: The Long Read",
    "url": "https://www.theguardian.com/news/series/the-long-read",
    "kind": "web",
    "category": "Journalism",
    "description": "Immersive, deeply researched longform journalism chronicling extraordinary human narratives.",
    "tags": [
      "Journalism",
      "Longform",
      "Reading",
      "Culture"
    ],
    "durationEstimateMinutes": 25,
    "sourceType": "curated_web",
    "rationale": "A masterclass in narrative pacing, literary journalism, and in-depth investigation."
  },
  {
    "id": "sug-bellingcat",
    "title": "Bellingcat: Open-Source Intelligence & Forensics",
    "url": "https://www.bellingcat.com",
    "kind": "web",
    "category": "Journalism",
    "description": "Groundbreaking open-source investigations verifying satellite imagery, flight logs, and conflict zones.",
    "tags": [
      "Journalism",
      "OSINT",
      "Investigation",
      "Forensics"
    ],
    "durationEstimateMinutes": 20,
    "sourceType": "curated_web",
    "rationale": "Learn methodologies of rigorous open verification in an era of synthetic media."
  },
  {
    "id": "sug-foreign-affairs",
    "title": "Foreign Affairs: International Grand Strategy",
    "url": "https://www.foreignaffairs.com",
    "kind": "web",
    "category": "Journalism",
    "description": "The definitive journal on international relations, diplomatic statecraft, and geopolitical balance of power.",
    "tags": [
      "Journalism",
      "Geopolitics",
      "Policy",
      "Strategy"
    ],
    "durationEstimateMinutes": 20,
    "sourceType": "curated_web",
    "rationale": "Understand sovereign incentives, nuclear deterrence, and maritime trade straits."
  },
  {
    "id": "sug-csis",
    "title": "CSIS: Defense & Geopolitical Strategy Reports",
    "url": "https://www.csis.org/analysis",
    "kind": "web",
    "category": "Journalism",
    "description": "Strategic insights on semiconductor export controls, missile defense, and undersea fiber security.",
    "tags": [
      "Journalism",
      "Geopolitics",
      "Security",
      "Strategy"
    ],
    "durationEstimateMinutes": 15,
    "sourceType": "curated_web",
    "rationale": "Sober, empirical national security briefings from veteran policy practitioners."
  },
  {
    "id": "sug-al-jazeera-features",
    "title": "Al Jazeera: In-Depth Global Features",
    "url": "https://www.aljazeera.com/features",
    "kind": "web",
    "category": "Journalism",
    "description": "Vivid dispatches covering civilian resilience, climate displacement, and cultural heritage.",
    "tags": [
      "Journalism",
      "Global",
      "Human",
      "Culture"
    ],
    "durationEstimateMinutes": 15,
    "sourceType": "curated_web",
    "rationale": "Broaden empathy with dispatches from regions rarely covered in Western media."
  },
  {
    "id": "sug-bbc-future",
    "title": "BBC Future: Long-Term Civilizational Inquiries",
    "url": "https://www.bbc.com/future",
    "kind": "web",
    "category": "Journalism",
    "description": "Explorations into the deep future of humanity, existential risk, psychology, and space settlement.",
    "tags": [
      "Journalism",
      "Science",
      "Future",
      "Thinking"
    ],
    "durationEstimateMinutes": 15,
    "sourceType": "curated_web",
    "rationale": "Shift focus from 24-hour rage cycles to multi-century civilizational perspectives."
  },
  {
    "id": "sug-undark",
    "title": "Undark Magazine: Science & Society Intersection",
    "url": "https://undark.org",
    "kind": "web",
    "category": "Journalism",
    "description": "Award-winning non-profit digital magazine exploring where science collides with politics and economics.",
    "tags": [
      "Journalism",
      "Science",
      "Ethics",
      "Society"
    ],
    "durationEstimateMinutes": 15,
    "sourceType": "curated_web",
    "rationale": "Investigates clinical trials, environmental contamination, and agricultural biotechnology."
  },
  {
    "id": "sug-mit-tech-review",
    "title": "MIT Technology Review: Emerging Technology",
    "url": "https://www.technologyreview.com",
    "kind": "web",
    "category": "Journalism",
    "description": "Authoritative reporting on neural nets, CRISPR breakthroughs, fusion energy, and quantum processors.",
    "tags": [
      "Journalism",
      "Technology",
      "Science",
      "AI"
    ],
    "durationEstimateMinutes": 15,
    "sourceType": "curated_web",
    "rationale": "Separate legitimate technological breakthroughs from hype cycles."
  },
  {
    "id": "sug-foreign-policy",
    "title": "Foreign Policy: Diplomacy & Sovereign Power",
    "url": "https://foreignpolicy.com",
    "kind": "web",
    "category": "Journalism",
    "description": "Expert analysis on international conflicts, energy alliances, sanctions, and multilateral summits.",
    "tags": [
      "Journalism",
      "Geopolitics",
      "Policy",
      "Global"
    ],
    "durationEstimateMinutes": 15,
    "sourceType": "curated_web",
    "rationale": "Learn how diplomats, trade envoys, and militaries calculate regional strategic leverage."
  },
  {
    "id": "sug-dw-global-ideas",
    "title": "Deutsche Welle: Solutions & Green Transition",
    "url": "https://www.dw.com/en/global-ideas/s-100806",
    "kind": "web",
    "category": "Journalism",
    "description": "Constructive journalism documenting renewable energy grids, reforestation, and circular manufacturing.",
    "tags": [
      "Journalism",
      "Environment",
      "Solutions",
      "Global"
    ],
    "durationEstimateMinutes": 10,
    "sourceType": "curated_web",
    "rationale": "Inspiring solutions-focused reporting on environmental ingenuity."
  },
  {
    "id": "sug-the-wire-science",
    "title": "The Wire Science: Public Health & Ecology",
    "url": "https://science.thewire.in",
    "kind": "web",
    "category": "Journalism",
    "description": "Critical reporting on environmental toxicology, epidemiology, and biodiversity in developing economies.",
    "tags": [
      "Journalism",
      "Science",
      "Ecology",
      "Health"
    ],
    "durationEstimateMinutes": 15,
    "sourceType": "curated_web",
    "rationale": "Scientific accountability reporting centered on human health and regional ecology."
  },
  {
    "id": "sug-mit-ocw",
    "title": "MIT OpenCourseWare: Free MIT Course Materials",
    "url": "https://ocw.mit.edu",
    "kind": "web",
    "category": "Academia",
    "description": "Unrestricted syllabi, lecture notes, video lectures, and exams from thousands of MIT courses.",
    "tags": [
      "Academia",
      "Education",
      "MIT",
      "Courseware",
      "Science"
    ],
    "durationEstimateMinutes": 25,
    "sourceType": "curated_web",
    "rationale": "World-class university education completely free, self-paced, and unencumbered."
  },
  {
    "id": "sug-yale-open-courses",
    "title": "Open Yale Courses: Humanities, History & Physics",
    "url": "https://oyc.yale.edu",
    "kind": "web",
    "category": "Academia",
    "description": "Full high-definition video and audio recordings of iconic Yale college introductory lecture series.",
    "tags": [
      "Academia",
      "Yale",
      "Humanities",
      "History",
      "Courseware"
    ],
    "durationEstimateMinutes": 25,
    "sourceType": "curated_web",
    "rationale": "Immerse in legendary college lectures from master Yale scholars across literature, physics, and history."
  },
  {
    "id": "sug-harvard-online",
    "title": "Harvard Online Learning: Free Audits & Lectures",
    "url": "https://www.harvardonline.harvard.edu",
    "kind": "web",
    "category": "Academia",
    "description": "Explore Harvard University courses on computer science, bioethics, neuroscience, and rhetoric.",
    "tags": [
      "Academia",
      "Harvard",
      "Education",
      "Courseware"
    ],
    "durationEstimateMinutes": 20,
    "sourceType": "curated_web",
    "rationale": "Access elite academic pedagogy to structure your spare-time self-education."
  },
  {
    "id": "sug-stanford-online",
    "title": "Stanford Online: Free Seminars & Lectures",
    "url": "https://online.stanford.edu/free-courses",
    "kind": "web",
    "category": "Academia",
    "description": "Stanford engineering, cryptography, artificial intelligence, and organizational design seminars.",
    "tags": [
      "Academia",
      "Stanford",
      "Engineering",
      "Technology"
    ],
    "durationEstimateMinutes": 20,
    "sourceType": "curated_web",
    "rationale": "Stay abreast of foundational and frontier engineering curriculum from Silicon Valley's flagship university."
  },
  {
    "id": "sug-khan-academy",
    "title": "Khan Academy: Foundational Mastery",
    "url": "https://www.khanacademy.org",
    "kind": "web",
    "category": "Academia",
    "description": "Master linear algebra, organic chemistry, microeconomics, or world history step-by-step.",
    "tags": [
      "Academia",
      "Education",
      "Mastery",
      "Math"
    ],
    "durationEstimateMinutes": 15,
    "sourceType": "curated_web",
    "rationale": "Fill foundational knowledge gaps with clear interactive explanations and quizzes."
  },
  {
    "id": "sug-edx-free",
    "title": "edX: Elite University Course Tracks",
    "url": "https://www.edx.org",
    "kind": "web",
    "category": "Academia",
    "description": "Free course audit tracks from Berkeley, Caltech, Oxford, Sorbonne, and McGill University.",
    "tags": [
      "Academia",
      "University",
      "Courseware",
      "Education"
    ],
    "durationEstimateMinutes": 20,
    "sourceType": "curated_web",
    "rationale": "Follow a rigorous, weekly academic curriculum across diverse domains."
  },
  {
    "id": "sug-coursera-audits",
    "title": "Coursera: Free University Course Audits",
    "url": "https://www.coursera.org",
    "kind": "web",
    "category": "Academia",
    "description": "Audit university coursework on machine learning, ancient Greek philosophy, and cognitive science.",
    "tags": [
      "Academia",
      "Learning",
      "Courseware"
    ],
    "durationEstimateMinutes": 20,
    "sourceType": "curated_web",
    "rationale": "Top university instructors guiding you through structured intellectual concepts."
  },
  {
    "id": "sug-cmu-open-learning",
    "title": "Carnegie Mellon: Open Learning Initiative",
    "url": "https://oli.cmu.edu",
    "kind": "web",
    "category": "Academia",
    "description": "Scientifically engineered courses leveraging cognitive learning science to accelerate mastery.",
    "tags": [
      "Academia",
      "Computer Science",
      "Cognitive",
      "Courseware"
    ],
    "durationEstimateMinutes": 20,
    "sourceType": "curated_web",
    "rationale": "Learn from CMU's pioneering research on student cognition and structured problem-solving."
  },
  {
    "id": "sug-oxford-podcasts",
    "title": "University of Oxford: Podcasts & Lectures",
    "url": "https://podcasts.ox.ac.uk",
    "kind": "web",
    "category": "Academia",
    "description": "Over 5,000 public lectures delivered by Oxford professors on philosophy, literature, and biology.",
    "tags": [
      "Academia",
      "Oxford",
      "Podcasts",
      "Humanities"
    ],
    "durationEstimateMinutes": 25,
    "sourceType": "curated_web",
    "rationale": "Turn spare commute or walking time into an Oxford tutorial dialogue."
  },
  {
    "id": "sug-cambridge-digital",
    "title": "Cambridge University: Digital Library & Research",
    "url": "https://cudl.lib.cam.ac.uk",
    "kind": "web",
    "category": "Academia",
    "description": "Examine original digitized manuscripts of Isaac Newton, Charles Darwin, and Alan Turing.",
    "tags": [
      "Academia",
      "History",
      "Science",
      "Manuscripts"
    ],
    "durationEstimateMinutes": 15,
    "sourceType": "curated_web",
    "rationale": "Touch the primary source notebooks that founded modern science and computing."
  },
  {
    "id": "sug-berkeley-webcasts",
    "title": "UC Berkeley: Class Central & Webcasts",
    "url": "https://www.classcentral.com/university/berkeley",
    "kind": "web",
    "category": "Academia",
    "description": "Famous undergraduate course archives in sociology, astronomy, and behavioral biology.",
    "tags": [
      "Academia",
      "Berkeley",
      "Education",
      "Science"
    ],
    "durationEstimateMinutes": 20,
    "sourceType": "curated_web",
    "rationale": "Experience Berkeley's passionate, boundary-pushing public university teaching."
  },
  {
    "id": "sug-princeton-public",
    "title": "Princeton University: Public Lecture Archives",
    "url": "https://lectures.princeton.edu",
    "kind": "web",
    "category": "Academia",
    "description": "Scholarly lectures addressing ethics, international economics, and quantum science.",
    "tags": [
      "Academia",
      "Princeton",
      "Lectures",
      "Ethics"
    ],
    "durationEstimateMinutes": 25,
    "sourceType": "curated_web",
    "rationale": "Engage with deep disciplinary research presented for curious intellectual audiences."
  },
  {
    "id": "sug-saylor-academy",
    "title": "Saylor Academy: Tuition-Free College Courses",
    "url": "https://www.saylor.org",
    "kind": "web",
    "category": "Academia",
    "description": "Curated, open-textbook college courses in philosophy, art history, and business administration.",
    "tags": [
      "Academia",
      "Education",
      "Free",
      "Courseware"
    ],
    "durationEstimateMinutes": 20,
    "sourceType": "curated_web",
    "rationale": "Self-directed structured study without subscription walls or expiration deadlines."
  },
  {
    "id": "sug-nature-masterclasses",
    "title": "Nature Masterclasses: Scientific Communication",
    "url": "https://masterclasses.nature.com",
    "kind": "web",
    "category": "Academia",
    "description": "Scientific writing, data presentation, and peer review fundamentals taught by Nature journal editors.",
    "tags": [
      "Academia",
      "Science",
      "Writing",
      "Research"
    ],
    "durationEstimateMinutes": 15,
    "sourceType": "curated_web",
    "rationale": "Learn the precision and structural discipline of top-tier scientific publishing."
  },
  {
    "id": "sug-gresham-college",
    "title": "Gresham College: Free Public Lectures Since 1597",
    "url": "https://www.gresham.ac.uk",
    "kind": "web",
    "category": "Academia",
    "description": "Distinguished professors deliver free hour-long lectures on astronomy, music, law, and history.",
    "tags": [
      "Academia",
      "History",
      "Lectures",
      "Culture"
    ],
    "durationEstimateMinutes": 20,
    "sourceType": "curated_web",
    "rationale": "London's oldest higher education institution dedicated to public intellectual enrichment."
  },
  {
    "id": "sug-arxiv-cs",
    "title": "ArXiv CS: AI, Algorithms & Neural Systems",
    "url": "https://arxiv.org/list/cs/recent",
    "kind": "web",
    "category": "Research",
    "description": "Skim primary source preprints in artificial intelligence, neural networks, and distributed systems.",
    "tags": [
      "Research",
      "AI",
      "Papers",
      "Computer Science"
    ],
    "durationEstimateMinutes": 15,
    "sourceType": "curated_web",
    "rationale": "Stay ahead of primary source scientific breakthroughs without algorithmic distortion."
  },
  {
    "id": "sug-quanta-mag",
    "title": "Quanta Magazine: Physics, Math & Biology",
    "url": "https://www.quantamagazine.org",
    "kind": "web",
    "category": "Research",
    "description": "Illuminating, rigorous reporting on fundamental mathematics, theoretical physics, and cellular mysteries.",
    "tags": [
      "Research",
      "Science",
      "Math",
      "Physics"
    ],
    "durationEstimateMinutes": 15,
    "sourceType": "curated_web",
    "rationale": "Unrivaled visual and explanatory depth into the frontier of pure science."
  },
  {
    "id": "sug-distill-pub",
    "title": "Distill.pub: Visual Machine Learning Foundations",
    "url": "https://distill.pub",
    "kind": "web",
    "category": "Research",
    "description": "Interactive visual explanations of neural networks, attention mechanisms, and loss manifolds.",
    "tags": [
      "Research",
      "AI",
      "Visualization",
      "Machine Learning"
    ],
    "durationEstimateMinutes": 20,
    "sourceType": "curated_web",
    "rationale": "Master neural architecture intuitions through interactive, peer-reviewed diagrams."
  },
  {
    "id": "sug-papers-with-code",
    "title": "Papers With Code: Reproducible ML Research",
    "url": "https://paperswithcode.com",
    "kind": "web",
    "category": "Research",
    "description": "Browse state-of-the-art benchmarks, tasks, and accompanying PyTorch/JAX implementations.",
    "tags": [
      "Research",
      "AI",
      "Code",
      "Benchmarks"
    ],
    "durationEstimateMinutes": 15,
    "sourceType": "curated_web",
    "rationale": "Verify whether algorithmic claims actually translate to reproducible code."
  },
  {
    "id": "sug-our-world-in-data",
    "title": "Our World in Data: Research on Global Problems",
    "url": "https://ourworldindata.org",
    "kind": "web",
    "category": "Research",
    "description": "Empirical research and interactive charts documenting health, poverty, energy, and famine.",
    "tags": [
      "Research",
      "Data",
      "Global",
      "Society"
    ],
    "durationEstimateMinutes": 15,
    "sourceType": "curated_web",
    "rationale": "Counter sensationalism with rigorous long-term historical data on human progress."
  },
  {
    "id": "sug-pew-research",
    "title": "Pew Research Center: Social Trends & Demographics",
    "url": "https://www.pewresearch.org",
    "kind": "web",
    "category": "Research",
    "description": "Impartial public opinion polling and demographic trends tracking internet culture and politics.",
    "tags": [
      "Research",
      "Demographics",
      "Society",
      "Reports"
    ],
    "durationEstimateMinutes": 15,
    "sourceType": "curated_web",
    "rationale": "Understand real social shifts with nonpartisan statistical methodology."
  },
  {
    "id": "sug-brookings",
    "title": "Brookings Institution: Public Policy Reports",
    "url": "https://www.brookings.edu/research",
    "kind": "web",
    "category": "Research",
    "description": "Nonpartisan research briefs examining governance, city development, and international security.",
    "tags": [
      "Research",
      "Policy",
      "Governance",
      "Reports"
    ],
    "durationEstimateMinutes": 20,
    "sourceType": "curated_web",
    "rationale": "Examine detailed policy prescriptions on urban housing, education, and trade."
  },
  {
    "id": "sug-rand-corp",
    "title": "RAND Corporation: Objective Public Research",
    "url": "https://www.rand.org/pubs.html",
    "kind": "web",
    "category": "Research",
    "description": "Rigorous quantitative analysis on defense technology, public health, and artificial intelligence safety.",
    "tags": [
      "Research",
      "Policy",
      "Defense",
      "Reports"
    ],
    "durationEstimateMinutes": 20,
    "sourceType": "curated_web",
    "rationale": "Read the institutional reports evaluating geopolitical risk and national infrastructure."
  },
  {
    "id": "sug-nature-briefing",
    "title": "Nature Briefing: Frontiers of Science",
    "url": "https://www.nature.com/nature/articles?type=nature-briefing",
    "kind": "web",
    "category": "Research",
    "description": "Curated daily essential reads from across the global scientific community.",
    "tags": [
      "Research",
      "Science",
      "Nature",
      "Discoveries"
    ],
    "durationEstimateMinutes": 10,
    "sourceType": "curated_web",
    "rationale": "Quickly scan the most pivotal papers published across biology, geology, and astronomy."
  },
  {
    "id": "sug-science-org",
    "title": "Science (AAAS): News, Policy & Research",
    "url": "https://www.science.org/news",
    "kind": "web",
    "category": "Research",
    "description": "Peer-reviewed research and global science policy journalism from the premier American journal.",
    "tags": [
      "Research",
      "Science",
      "AAAS",
      "Discoveries"
    ],
    "durationEstimateMinutes": 15,
    "sourceType": "curated_web",
    "rationale": "Stay informed on landmark scientific controversies, ethical frameworks, and discoveries."
  },
  {
    "id": "sug-plos-one",
    "title": "PLOS ONE: Open-Access Multi-Disciplinary Research",
    "url": "https://journals.plos.org/plosone",
    "kind": "web",
    "category": "Research",
    "description": "Open science publisher evaluating papers purely on rigorous methodology rather than perceived prestige.",
    "tags": [
      "Research",
      "Open Science",
      "Papers",
      "Biology"
    ],
    "durationEstimateMinutes": 15,
    "sourceType": "curated_web",
    "rationale": "Experience true open-access science where replication and transparent data rule."
  },
  {
    "id": "sug-annual-reviews",
    "title": "Knowable Magazine by Annual Reviews",
    "url": "https://knowablemagazine.org",
    "kind": "web",
    "category": "Research",
    "description": "Scholarly synthesis articles written by science journalists translating deep academic review papers.",
    "tags": [
      "Research",
      "Science",
      "Review",
      "Reading"
    ],
    "durationEstimateMinutes": 15,
    "sourceType": "curated_web",
    "rationale": "Grasp the consensus of 50 years of literature in a single, well-written 15-minute article."
  },
  {
    "id": "sug-sciam",
    "title": "Scientific American: Perspectives & Explorations",
    "url": "https://www.scientificamerican.com",
    "kind": "web",
    "category": "Research",
    "description": "The oldest continuously published monthly magazine in the United States exploring new hypotheses.",
    "tags": [
      "Research",
      "Science",
      "History",
      "Curiosity"
    ],
    "durationEstimateMinutes": 15,
    "sourceType": "curated_web",
    "rationale": "Cultivate wide-ranging scientific curiosity across paleontology, cosmology, and neuroscience."
  },
  {
    "id": "sug-quantamag-math",
    "title": "Quanta: Pure Mathematics & Number Theory",
    "url": "https://www.quantamagazine.org/mathematics",
    "kind": "web",
    "category": "Research",
    "description": "Celebrate abstract mathematical discoveries, Riemann hypothesis progress, and Ramsey theory breakthroughs.",
    "tags": [
      "Research",
      "Math",
      "Topology",
      "Pure Science"
    ],
    "durationEstimateMinutes": 20,
    "sourceType": "curated_web",
    "rationale": "Marvel at the pure architectural beauty of human mathematical reasoning."
  },
  {
    "id": "sug-nih-pmc",
    "title": "PubMed Central: Biomedical Research Archive",
    "url": "https://www.ncbi.nlm.nih.gov/pmc",
    "kind": "web",
    "category": "Research",
    "description": "National Institutes of Health full-text archive of life sciences journal literature.",
    "tags": [
      "Research",
      "Biology",
      "Medicine",
      "Health"
    ],
    "durationEstimateMinutes": 20,
    "sourceType": "curated_web",
    "rationale": "Verify primary clinical trial results directly rather than trusting health influencers."
  },
  {
    "id": "sug-cern-courier",
    "title": "CERN Courier: High-Energy Physics & Cosmology",
    "url": "https://cerncourier.com",
    "kind": "web",
    "category": "Research",
    "description": "Updates from the Large Hadron Collider on Higgs precision, neutrinos, and the early universe.",
    "tags": [
      "Research",
      "Physics",
      "CERN",
      "Cosmology"
    ],
    "durationEstimateMinutes": 15,
    "sourceType": "curated_web",
    "rationale": "Peer into the machinery decoding the fundamental constituents of reality."
  },
  {
    "id": "sug-sep",
    "title": "Stanford Encyclopedia of Philosophy (SEP)",
    "url": "https://plato.stanford.edu",
    "kind": "web",
    "category": "Philosophy",
    "description": "Peer-reviewed, continuously updated comprehensive encyclopedia written by leading philosophers.",
    "tags": [
      "Philosophy",
      "Ethics",
      "Epistemology",
      "Academia"
    ],
    "durationEstimateMinutes": 25,
    "sourceType": "curated_web",
    "rationale": "The most rigorous repository of human philosophical reasoning on epistemology, mind, and ethics."
  },
  {
    "id": "sug-aeon",
    "title": "Aeon: Profound Philosophy, Science & Culture",
    "url": "https://aeon.co",
    "kind": "web",
    "category": "Philosophy",
    "description": "Explore timeless philosophical questions, human psychology, consciousness, and scientific inquiries.",
    "tags": [
      "Philosophy",
      "Essays",
      "Wisdom",
      "Reading"
    ],
    "durationEstimateMinutes": 20,
    "sourceType": "curated_web",
    "rationale": "Long-arc human wisdom and intellectual exploration free of sensational clickbait."
  },
  {
    "id": "sug-philosophy-bites",
    "title": "Philosophy Bites: 15-Minute Expert Dialogues",
    "url": "https://philosophybites.com",
    "kind": "web",
    "category": "Philosophy",
    "description": "Concise 15-minute interviews with top philosophers addressing specific philosophical problems.",
    "tags": [
      "Philosophy",
      "Audio",
      "Dialogues",
      "Ethics"
    ],
    "durationEstimateMinutes": 15,
    "sourceType": "curated_web",
    "rationale": "Clear, accessible audio discussions on free will, justice, truth, and aesthetics."
  },
  {
    "id": "sug-daily-nous",
    "title": "Daily Nous: News & Debates in Philosophy",
    "url": "https://dailynous.com",
    "kind": "web",
    "category": "Philosophy",
    "description": "Discussions on philosophical research, university ethics, and modern moral dilemmas.",
    "tags": [
      "Philosophy",
      "Debate",
      "Ethics",
      "Academia"
    ],
    "durationEstimateMinutes": 10,
    "sourceType": "curated_web",
    "rationale": "Keep finger on the pulse of contemporary academic philosophical disputes."
  },
  {
    "id": "sug-iep",
    "title": "Internet Encyclopedia of Philosophy (IEP)",
    "url": "https://iep.utm.edu",
    "kind": "web",
    "category": "Philosophy",
    "description": "Accessible, peer-reviewed introductions to major philosophers, logic paradoxes, and ethical theories.",
    "tags": [
      "Philosophy",
      "Logic",
      "Ethics",
      "Reference"
    ],
    "durationEstimateMinutes": 15,
    "sourceType": "curated_web",
    "rationale": "Clear and pedagogical explanations of complex historical and analytic philosophy."
  },
  {
    "id": "sug-lesswrong",
    "title": "LessWrong: Rationality & Decision Making",
    "url": "https://www.lesswrong.com",
    "kind": "web",
    "category": "Philosophy",
    "description": "Community dedicated to refining the art of human rationality, cognitive debiasing, and epistemic hygiene.",
    "tags": [
      "Philosophy",
      "Rationality",
      "Decision Making",
      "AI"
    ],
    "durationEstimateMinutes": 20,
    "sourceType": "curated_web",
    "rationale": "Sharpen probabilistic reasoning, spot cognitive blindspots, and calibrate beliefs."
  },
  {
    "id": "sug-astral-codex-ten",
    "title": "Astral Codex Ten by Scott Alexander",
    "url": "https://www.astralcodexten.com",
    "kind": "web",
    "category": "Philosophy",
    "description": "Nuanced, exhaustive essays bridging psychiatry, statistical reasoning, philosophy, and history.",
    "tags": [
      "Philosophy",
      "Rationality",
      "Essays",
      "Science"
    ],
    "durationEstimateMinutes": 25,
    "sourceType": "curated_web",
    "rationale": "Exemplary charitable reasoning, intellectual curiosity, and exploration of complex social systems."
  },
  {
    "id": "sug-farnam-street",
    "title": "Farnam Street: Mental Models & First Principles",
    "url": "https://fs.blog/mental-models",
    "kind": "web",
    "category": "Philosophy",
    "description": "Latticework of mental models: inversion, Hanlon's razor, second-order thinking, and circle of competence.",
    "tags": [
      "Philosophy",
      "Mental Models",
      "Wisdom",
      "Decisions"
    ],
    "durationEstimateMinutes": 15,
    "sourceType": "curated_web",
    "rationale": "Build durable frameworks to make sound decisions and avoid preventable errors."
  },
  {
    "id": "sug-psyche-co",
    "title": "Psyche: Psychological Philosophy & Well-Being",
    "url": "https://psyche.co",
    "kind": "web",
    "category": "Philosophy",
    "description": "Illuminating guides on living well, navigating grief, fostering friendships, and cultivating purpose.",
    "tags": [
      "Philosophy",
      "Psychology",
      "Well-being",
      "Wisdom"
    ],
    "durationEstimateMinutes": 15,
    "sourceType": "curated_web",
    "rationale": "Philosophy brought to bear on real, everyday emotional and existential challenges."
  },
  {
    "id": "sug-the-point-mag",
    "title": "The Point Magazine: Philosophical Inquiries",
    "url": "https://thepointmag.com",
    "kind": "web",
    "category": "Philosophy",
    "description": "Rigorous essays asking fundamental questions about love, art, work, and morality in modern life.",
    "tags": [
      "Philosophy",
      "Essays",
      "Culture",
      "Literature"
    ],
    "durationEstimateMinutes": 20,
    "sourceType": "curated_web",
    "rationale": "Literary essays that treat culture and modern politics with serious philosophical depth."
  },
  {
    "id": "sug-history-of-philosophy",
    "title": "History of Philosophy Without Any Gaps",
    "url": "https://historyofphilosophy.net",
    "kind": "web",
    "category": "Philosophy",
    "description": "Peter Adamson's chronological journey through Classical, Islamic, Medieval, and Indian philosophy.",
    "tags": [
      "Philosophy",
      "History",
      "Podcasts",
      "Wisdom"
    ],
    "durationEstimateMinutes": 20,
    "sourceType": "curated_web",
    "rationale": "Systematic chronological foundation covering overlooked philosophical traditions and figures."
  },
  {
    "id": "sug-daily-stoic",
    "title": "Stoic Letters & Meditations Archive",
    "url": "https://en.wikisource.org/wiki/Moral_letters_to_Lucilius",
    "kind": "web",
    "category": "Philosophy",
    "description": "Read Seneca's Moral Letters to Lucilius on the shortness of life, tranquility, and true friendship.",
    "tags": [
      "Philosophy",
      "Stoicism",
      "Wisdom",
      "Classics"
    ],
    "durationEstimateMinutes": 15,
    "sourceType": "curated_web",
    "rationale": "Practical classical stoicism to center attention and dissolve modern anxieties."
  },
  {
    "id": "sug-in-our-time-philosophy",
    "title": "BBC In Our Time: Philosophy Archive",
    "url": "https://www.bbc.co.uk/programmes/p01f0vzr",
    "kind": "web",
    "category": "Philosophy",
    "description": "Melvyn Bragg and three university academics unpack Kant, Spinoza, Wittgenstein, and existentialism.",
    "tags": [
      "Philosophy",
      "Audio",
      "History",
      "Ideas"
    ],
    "durationEstimateMinutes": 25,
    "sourceType": "curated_web",
    "rationale": "The finest academic podcast dissecting the lineage of human philosophical thoughts."
  },
  {
    "id": "sug-utilitarianism-net",
    "title": "Utilitarianism.net: Normative Ethics Textbook",
    "url": "https://www.utilitarianism.net",
    "kind": "web",
    "category": "Philosophy",
    "description": "Interactive, lucid introduction to consequentialist ethics, moral circle expansion, and animal welfare.",
    "tags": [
      "Philosophy",
      "Ethics",
      "Morality",
      "Effective Altruism"
    ],
    "durationEstimateMinutes": 20,
    "sourceType": "curated_web",
    "rationale": "Examine the philosophical foundations for reducing suffering across the globe."
  },
  {
    "id": "sug-parfit-reasons",
    "title": "Derek Parfit: Identity & Future Generations",
    "url": "https://www.rep.routledge.com/articles/thematic/parfit-derek-1942-2017/v-1",
    "kind": "web",
    "category": "Philosophy",
    "description": "Thought experiments on personal identity, teletransporters, and our obligations to future generations.",
    "tags": [
      "Philosophy",
      "Ethics",
      "Identity",
      "Future"
    ],
    "durationEstimateMinutes": 20,
    "sourceType": "curated_web",
    "rationale": "One of the most consequential moral philosophy frameworks of the modern era."
  },
  {
    "id": "sug-philosophical-gourmet",
    "title": "Leiter Reports: Perspectives on Law & Ethics",
    "url": "https://leiterreports.typepad.com",
    "kind": "web",
    "category": "Philosophy",
    "description": "Brian Leiter's analysis of legal philosophy, jurisprudence, and Friedrich Nietzsche's moral psychology.",
    "tags": [
      "Philosophy",
      "Law",
      "Jurisprudence",
      "Ethics"
    ],
    "durationEstimateMinutes": 15,
    "sourceType": "curated_web",
    "rationale": "Rigorous jurisprudence exploring how moral philosophies encode into legal reality."
  },
  {
    "id": "sug-the-paris-review",
    "title": "The Paris Review: Writers at Work Interviews",
    "url": "https://www.theparisreview.org/interviews",
    "kind": "web",
    "category": "Literature",
    "description": "Legendary longform craft conversations with Hemingway, Garcia Marquez, Toni Morrison, and Haruki Murakami.",
    "tags": [
      "Literature",
      "Craft",
      "Interviews",
      "Writing"
    ],
    "durationEstimateMinutes": 20,
    "sourceType": "curated_web",
    "rationale": "Discover how the greatest writers in human history disciplined their time and perfected their art."
  },
  {
    "id": "sug-lithub",
    "title": "Literary Hub (LitHub): Daily Curation of Books",
    "url": "https://lithub.com",
    "kind": "web",
    "category": "Literature",
    "description": "The best of the literary internet: book recommendations, essays on reading, and craft advice.",
    "tags": [
      "Literature",
      "Books",
      "Essays",
      "Culture"
    ],
    "durationEstimateMinutes": 15,
    "sourceType": "curated_web",
    "rationale": "Cultivate a rich reading life and discover remarkable under-the-radar novels and memoirs."
  },
  {
    "id": "sug-nyrb",
    "title": "The New York Review of Books",
    "url": "https://www.nybooks.com",
    "kind": "web",
    "category": "Literature",
    "description": "The premier intellectual and literary journal of reviews, poetry, and cultural criticism.",
    "tags": [
      "Literature",
      "Criticism",
      "Books",
      "Reading"
    ],
    "durationEstimateMinutes": 20,
    "sourceType": "curated_web",
    "rationale": "Uncompromising intellectual essays connecting literature to the broader human canvas."
  },
  {
    "id": "sug-lrb",
    "title": "London Review of Books (LRB)",
    "url": "https://www.lrb.co.uk",
    "kind": "web",
    "category": "Literature",
    "description": "Europe's leading literary magazine, famous for unhurried essays, personal memoirs, and history reviews.",
    "tags": [
      "Literature",
      "Essays",
      "Reading",
      "History"
    ],
    "durationEstimateMinutes": 20,
    "sourceType": "curated_web",
    "rationale": "Superb literary wit, prose mastery, and historical scholarship."
  },
  {
    "id": "sug-five-books",
    "title": "Five Books: The Best Books on Any Topic",
    "url": "https://fivebooks.com",
    "kind": "web",
    "category": "Literature",
    "description": "World-leading experts and scholars curate and explain their 5 essential book recommendations in their field.",
    "tags": [
      "Literature",
      "Books",
      "Curation",
      "Reading Lists"
    ],
    "durationEstimateMinutes": 15,
    "sourceType": "curated_web",
    "rationale": "Never waste time on a mediocre book again; get recommendations from field leaders."
  },
  {
    "id": "sug-standard-ebooks",
    "title": "Standard Ebooks: Meticulous Free Classics",
    "url": "https://standardebooks.org",
    "kind": "web",
    "category": "Literature",
    "description": "Volunteer-driven, open-source project producing beautifully formatted, typographic public domain ebooks.",
    "tags": [
      "Literature",
      "Classics",
      "Ebooks",
      "Open Source"
    ],
    "durationEstimateMinutes": 15,
    "sourceType": "curated_web",
    "rationale": "Read Jane Austen, Dostoevsky, and Marcus Aurelius with perfect modern digital typography."
  },
  {
    "id": "sug-poetry-foundation",
    "title": "Poetry Foundation: Poem of the Day & Audio",
    "url": "https://www.poetryfoundation.org",
    "kind": "web",
    "category": "Literature",
    "description": "Discover classical and contemporary poems accompanied by audio readings and historical context.",
    "tags": [
      "Literature",
      "Poetry",
      "Art",
      "Contemplation"
    ],
    "durationEstimateMinutes": 10,
    "sourceType": "curated_web",
    "rationale": "Poetry exercises associative thinking and linguistic precision in 5 quiet minutes."
  },
  {
    "id": "sug-longform-org",
    "title": "Longform.org: Exceptional Narrative Nonfiction",
    "url": "https://longform.org",
    "kind": "web",
    "category": "Literature",
    "description": "Curated collection of the most compelling longform articles, profiles, and historical investigations.",
    "tags": [
      "Literature",
      "Nonfiction",
      "Longform",
      "Reading"
    ],
    "durationEstimateMinutes": 20,
    "sourceType": "curated_web",
    "rationale": "Experience true storytelling craft that stays with you long after closing the tab."
  },
  {
    "id": "sug-project-gutenberg",
    "title": "Project Gutenberg: 70,000+ Free Ebooks",
    "url": "https://www.gutenberg.org",
    "kind": "web",
    "category": "Literature",
    "description": "The internet's oldest digital library of public domain literature, philosophy, and historical memoirs.",
    "tags": [
      "Literature",
      "Classics",
      "Library",
      "Free"
    ],
    "durationEstimateMinutes": 20,
    "sourceType": "curated_web",
    "rationale": "Free, immediate access to the collective literary canon of human civilization."
  },
  {
    "id": "sug-book-riot",
    "title": "Book Riot: Diverse Reading Communities",
    "url": "https://bookriot.com",
    "kind": "web",
    "category": "Literature",
    "description": "Celebration of reading across genres: literary fiction, science fiction, historical nonfiction, and translations.",
    "tags": [
      "Literature",
      "Books",
      "Community",
      "Reading"
    ],
    "durationEstimateMinutes": 15,
    "sourceType": "curated_web",
    "rationale": "Invigorate your reading habit with vibrant genre explorations and book club picks."
  },
  {
    "id": "sug-granta",
    "title": "Granta Magazine: The Magazine of New Writing",
    "url": "https://granta.com",
    "kind": "web",
    "category": "Literature",
    "description": "Celebrated showcase for contemporary memoir, photojournalism, and international short fiction.",
    "tags": [
      "Literature",
      "Fiction",
      "Memoir",
      "Craft"
    ],
    "durationEstimateMinutes": 20,
    "sourceType": "curated_web",
    "rationale": "Encounter bold international voices in contemporary literature."
  },
  {
    "id": "sug-the-millions",
    "title": "The Millions: Arts, Books & Culture",
    "url": "https://themillions.com",
    "kind": "web",
    "category": "Literature",
    "description": "Intelligent essays on contemporary fiction, author retrospectives, and year-end reading lists.",
    "tags": [
      "Literature",
      "Books",
      "Essays",
      "Culture"
    ],
    "durationEstimateMinutes": 15,
    "sourceType": "curated_web",
    "rationale": "Thoughtful, unpretentious conversations about why we read and what books mean to us."
  },
  {
    "id": "sug-public-domain-review",
    "title": "The Public Domain Review: Curious Art & History",
    "url": "https://publicdomainreview.org",
    "kind": "web",
    "category": "Literature",
    "description": "Explorations of forgotten illustrations, surreal medieval manuscripts, and curious historical oddities.",
    "tags": [
      "Literature",
      "Art",
      "History",
      "Curiosity"
    ],
    "durationEstimateMinutes": 15,
    "sourceType": "curated_web",
    "rationale": "A treasure chest of wonder that sparks creativity and appreciation for human eccentricities."
  },
  {
    "id": "sug-classic-essays",
    "title": "Orwell, Montaigne & Woolf Essays Archive",
    "url": "https://www.orwellfoundation.com/the-orwell-foundation/orwell/essays-and-other-works",
    "kind": "web",
    "category": "Literature",
    "description": "Read classic essays like George Orwell's 'Politics and the English Language' or Montaigne on experience.",
    "tags": [
      "Literature",
      "Essays",
      "Classics",
      "Writing"
    ],
    "durationEstimateMinutes": 20,
    "sourceType": "curated_web",
    "rationale": "Refine your own written thought by studying the masters of personal and political essay craft."
  },
  {
    "id": "sug-bookforum",
    "title": "Bookforum: Contemporary Fiction & Art Reviews",
    "url": "https://www.bookforum.com",
    "kind": "web",
    "category": "Literature",
    "description": "Insightful reviews of contemporary novels, artist monographs, and cultural studies.",
    "tags": [
      "Literature",
      "Art",
      "Books",
      "Reviews"
    ],
    "durationEstimateMinutes": 15,
    "sourceType": "curated_web",
    "rationale": "Deep cultural engagement with contemporary visual and textual art."
  },
  {
    "id": "sug-electric-lit",
    "title": "Electric Literature: The Future of Reading",
    "url": "https://electricliterature.com",
    "kind": "web",
    "category": "Literature",
    "description": "Essays exploring social movements, identity, and the modern human condition through books.",
    "tags": [
      "Literature",
      "Essays",
      "Books",
      "Culture"
    ],
    "durationEstimateMinutes": 15,
    "sourceType": "curated_web",
    "rationale": "Fresh, dynamic viewpoints on storytelling and the enduring relevance of novels."
  },
  {
    "id": "sug-greater-good",
    "title": "Greater Good Science Center (UC Berkeley)",
    "url": "https://greatergood.berkeley.edu",
    "kind": "web",
    "category": "Psychology",
    "description": "The science of a meaningful life: research on gratitude, empathy, social connection, and resilience.",
    "tags": [
      "Psychology",
      "Science",
      "Well-being",
      "Resilience"
    ],
    "durationEstimateMinutes": 15,
    "sourceType": "curated_web",
    "rationale": "Evidence-backed practices that elevate subjective well-being and relational warmth."
  },
  {
    "id": "sug-behavioral-scientist",
    "title": "Behavioral Scientist: Why We Do What We Do",
    "url": "https://behavioralscientist.org",
    "kind": "web",
    "category": "Psychology",
    "description": "Original reporting on human behavior, choice architecture, cognitive biases, and behavioral economics.",
    "tags": [
      "Psychology",
      "Behavior",
      "Nudges",
      "Decisions"
    ],
    "durationEstimateMinutes": 15,
    "sourceType": "curated_web",
    "rationale": "Understand the subtle environment triggers that drive human decisions and habits."
  },
  {
    "id": "sug-hidden-brain",
    "title": "Hidden Brain: Unconscious Patterns & Behavior",
    "url": "https://hiddenbrain.org",
    "kind": "web",
    "category": "Psychology",
    "description": "Shankar Vedantam combines science and storytelling to reveal the unconscious patterns driving relationships.",
    "tags": [
      "Psychology",
      "Audio",
      "Cognition",
      "Behavior"
    ],
    "durationEstimateMinutes": 20,
    "sourceType": "curated_web",
    "rationale": "Illuminate the subconscious biases and automatic habits that govern your days."
  },
  {
    "id": "sug-psyche-guides",
    "title": "Psyche Guides: Overcoming Impostor Syndrome & Procrastination",
    "url": "https://psyche.co/guides",
    "kind": "web",
    "category": "Psychology",
    "description": "Actionable, psychologist-authored frameworks for emotion regulation, self-compassion, and focus.",
    "tags": [
      "Psychology",
      "Mental Health",
      "Focus",
      "Self-Improvement"
    ],
    "durationEstimateMinutes": 15,
    "sourceType": "curated_web",
    "rationale": "Clinical psychological tools to overcome inner friction and unhelpful thought patterns."
  },
  {
    "id": "sug-huberman-lab",
    "title": "Huberman Lab: Neuroscience & Circadian Health",
    "url": "https://www.hubermanlab.com",
    "kind": "web",
    "category": "Psychology",
    "description": "Peer-reviewed neural mechanisms for sleep architecture, morning optic flow, and dopamine regulation.",
    "tags": [
      "Psychology",
      "Neuroscience",
      "Sleep",
      "Health"
    ],
    "durationEstimateMinutes": 25,
    "sourceType": "curated_web",
    "rationale": "Align your neurobiology and lighting to sustain natural focus and restorative sleep."
  },
  {
    "id": "sug-kahneman-heuristics",
    "title": "Kahneman & Tversky: Cognitive Heuristics",
    "url": "https://www.nobelprize.org/prizes/economic-sciences/2002/kahneman/biographical",
    "kind": "web",
    "category": "Psychology",
    "description": "Study prospect theory, availability cascades, framing effects, and System 1 versus System 2 thinking.",
    "tags": [
      "Psychology",
      "Cognition",
      "Decisions",
      "Nobel"
    ],
    "durationEstimateMinutes": 20,
    "sourceType": "curated_web",
    "rationale": "The foundational Nobel-winning psychology of human judgment under uncertainty."
  },
  {
    "id": "sug-dan-ariely",
    "title": "Predictably Irrational: Behavioral Economics",
    "url": "https://danariely.com",
    "kind": "web",
    "category": "Psychology",
    "description": "Fascinating experiments revealing how social norms, honesty, and pricing irrationalities shape choices.",
    "tags": [
      "Psychology",
      "Behavior",
      "Experiments",
      "Incentives"
    ],
    "durationEstimateMinutes": 15,
    "sourceType": "curated_web",
    "rationale": "Learn why willpower alone fails and how to design smart environmental defaults."
  },
  {
    "id": "sug-the-marginalian",
    "title": "The Marginalian (Maria Popova): Search for Meaning",
    "url": "https://www.themarginalian.org",
    "kind": "web",
    "category": "Psychology",
    "description": "Meaningful reflections on literature, psychology, love, solitude, and resilience across centuries.",
    "tags": [
      "Psychology",
      "Literature",
      "Wisdom",
      "Meaning"
    ],
    "durationEstimateMinutes": 20,
    "sourceType": "curated_web",
    "rationale": "A gentle antidote to cynicism; a sanctuary of poetic thought and emotional depth."
  },
  {
    "id": "sug-bps-digest",
    "title": "British Psychological Society Research Digest",
    "url": "https://www.bps.org.uk/research-digest",
    "kind": "web",
    "category": "Psychology",
    "description": "Engaging, objective overviews of newly published empirical psychology and cognitive science experiments.",
    "tags": [
      "Psychology",
      "Research",
      "Science",
      "Cognition"
    ],
    "durationEstimateMinutes": 10,
    "sourceType": "curated_web",
    "rationale": "Bite-sized, accurate reporting on memory, perception, and social psychology."
  },
  {
    "id": "sug-neuroscience-news",
    "title": "Neuroscience News: Synaptic Plasticity & Memory",
    "url": "https://neurosciencenews.com",
    "kind": "web",
    "category": "Psychology",
    "description": "Frontier research on adult neurogenesis, deep sleep memory consolidation, and brain-computer interfaces.",
    "tags": [
      "Psychology",
      "Neuroscience",
      "Brain",
      "Memory"
    ],
    "durationEstimateMinutes": 15,
    "sourceType": "curated_web",
    "rationale": "Understand the physical hardware of your mind and how deliberate practice alters synapses."
  },
  {
    "id": "sug-character-lab",
    "title": "Character Lab: Actionable Science for Growth",
    "url": "https://characterlab.org",
    "kind": "web",
    "category": "Psychology",
    "description": "Angela Duckworth's behavioral science advice on cultivating grit, curiosity, and emotional poise.",
    "tags": [
      "Psychology",
      "Grit",
      "Habits",
      "Growth"
    ],
    "durationEstimateMinutes": 10,
    "sourceType": "curated_web",
    "rationale": "Science-grounded tips to build perseverance on long-term consequential missions."
  },
  {
    "id": "sug-mind-and-life",
    "title": "Mind & Life: Contemplative Science & Compassion",
    "url": "https://www.mindandlife.org",
    "kind": "web",
    "category": "Psychology",
    "description": "Interdisciplinary dialogues between neuroscientists, Buddhist monks, and cognitive psychologists.",
    "tags": [
      "Psychology",
      "Contemplation",
      "Mindfulness",
      "Neuroscience"
    ],
    "durationEstimateMinutes": 15,
    "sourceType": "curated_web",
    "rationale": "Where empirical neurobiology meets centuries of contemplative attention training."
  },
  {
    "id": "sug-science-of-flow",
    "title": "The Science of Flow: Peak Concentration Research",
    "url": "https://www.flowresearchcollective.com",
    "kind": "web",
    "category": "Psychology",
    "description": "Neurochemistry of transient hypofrontality, dopamine-norepinephrine balance, and deep focus.",
    "tags": [
      "Psychology",
      "Flow",
      "Focus",
      "Neuroscience"
    ],
    "durationEstimateMinutes": 15,
    "sourceType": "curated_web",
    "rationale": "Engineer the environmental triggers that reliably usher you into unbroken flow states."
  },
  {
    "id": "sug-matthew-walker-sleep",
    "title": "The Science of Sleep: Matthew Walker Research",
    "url": "https://www.sleepdiplomat.com",
    "kind": "web",
    "category": "Psychology",
    "description": "The neurological indispensability of NREM and REM cycles for emotional stability and creative synthesis.",
    "tags": [
      "Psychology",
      "Sleep",
      "Health",
      "Neuroscience"
    ],
    "durationEstimateMinutes": 15,
    "sourceType": "curated_web",
    "rationale": "Recognize sleep as your supreme biological performance enhancer."
  },
  {
    "id": "sug-verywell-mind",
    "title": "Verywell Mind: Attachment Styles & Cognitive Schemas",
    "url": "https://www.verywellmind.com/theories-of-psychology-4846067",
    "kind": "web",
    "category": "Psychology",
    "description": "Clear conceptual explanations of cognitive dissonance, locus of control, and attachment theory.",
    "tags": [
      "Psychology",
      "Cognition",
      "Relationships",
      "Education"
    ],
    "durationEstimateMinutes": 10,
    "sourceType": "curated_web",
    "rationale": "Map your relationship patterns and internal mental models with psychological clarity."
  },
  {
    "id": "sug-physical-book",
    "title": "Read 10 Pages of a Physical Book",
    "kind": "habit",
    "category": "Offline",
    "description": "Step away from all backlit screens; immerse your eyes in analog printed pages for 15 unhurried minutes.",
    "tags": [
      "Offline",
      "Reading",
      "Mindfulness",
      "Habit"
    ],
    "durationEstimateMinutes": 15,
    "sourceType": "habit_idea",
    "rationale": "Printed paper engages tactile sensory channels and restores depleted digital attention spans."
  },
  {
    "id": "sug-commonplace-notebook",
    "title": "Analog Commonplace Notebook Braindump",
    "kind": "habit",
    "category": "Offline",
    "description": "Open a physical notebook. Transcribe one profound quote or write down 3 clear reflections on your day.",
    "tags": [
      "Offline",
      "Writing",
      "Clarity",
      "Wisdom"
    ],
    "durationEstimateMinutes": 10,
    "sourceType": "habit_idea",
    "rationale": "Writing by hand forces slower, more deliberate linguistic synthesis than typing."
  },
  {
    "id": "sug-physiological-sigh",
    "title": "Huberman Physiological Sigh Autonomous Reset",
    "kind": "habit",
    "category": "Wellness",
    "description": "Two deep inhales through the nose, followed by one long, slow, unhurried exhale through the mouth. Repeat 3 times.",
    "tags": [
      "Wellness",
      "Health",
      "Mindfulness",
      "Reset"
    ],
    "durationEstimateMinutes": 3,
    "sourceType": "habit_idea",
    "rationale": "Fastest neurobiological mechanism to offload carbon dioxide and reset autonomic stress."
  },
  {
    "id": "sug-optic-flow-walk",
    "title": "10-Minute Optic Flow Acoustic Walk",
    "kind": "habit",
    "category": "Offline",
    "description": "Step outside for a short stroll without your phone or earbuds. Let lateral optic flow wash over your visual field.",
    "tags": [
      "Offline",
      "Health",
      "Movement",
      "Mindfulness"
    ],
    "durationEstimateMinutes": 10,
    "sourceType": "habit_idea",
    "rationale": "Lateral optic flow calms the amygdala and sparks spontaneous creative problem solving."
  },
  {
    "id": "sug-box-breathing",
    "title": "Box Breathing (4-4-4-4) Autonomous Balance",
    "kind": "habit",
    "category": "Wellness",
    "description": "Inhale for 4 seconds, hold gently for 4, exhale smoothly for 4, hold empty for 4. Repeat for 4 cycles.",
    "tags": [
      "Wellness",
      "Mindfulness",
      "Focus",
      "Calm"
    ],
    "durationEstimateMinutes": 5,
    "sourceType": "habit_idea",
    "rationale": "Used by elite performers and surgeons to maintain steady hands and mental composure under pressure."
  },
  {
    "id": "sug-paper-architecture",
    "title": "Paper Architecture & System Diagram Sketch",
    "kind": "habit",
    "category": "Focus",
    "description": "Grab a blank sheet of paper and a pen. Map out a project's data flow, user state, or chapter outline.",
    "tags": [
      "Focus",
      "Architecture",
      "Offline",
      "Deep Work"
    ],
    "durationEstimateMinutes": 15,
    "sourceType": "habit_idea",
    "rationale": "Spatial reasoning on unlined paper frees your brain from software layout constraints."
  },
  {
    "id": "sug-eat-the-frog",
    "title": "'Eat the Frog' 25-Minute Unbroken Sprint",
    "kind": "habit",
    "category": "Focus",
    "description": "Identify your single highest-friction task. Set a 25-minute timer and attack it with zero interruptions.",
    "tags": [
      "Focus",
      "Deep Work",
      "Productivity"
    ],
    "durationEstimateMinutes": 25,
    "sourceType": "habit_idea",
    "rationale": "Knocking out the most intimidating friction point liberates the rest of your day."
  },
  {
    "id": "sug-two-minute-sweep",
    "title": "The 2-Minute Rule Workspace Sweep",
    "kind": "habit",
    "category": "Admin",
    "description": "Look across your desk. Return mugs to the kitchen, discard scraps, align notebooks, and tuck in your chair.",
    "tags": [
      "Admin",
      "Clarity",
      "Physical Space"
    ],
    "durationEstimateMinutes": 2,
    "sourceType": "habit_idea",
    "rationale": "Physical workspace entropy directly induces subconscious cognitive distraction."
  },
  {
    "id": "sug-single-tab-triage",
    "title": "Single-Tab Digital Horizon Triage",
    "kind": "habit",
    "category": "Focus",
    "description": "Close all extraneous browser tabs or save them to your reading list. Leave exactly 1 active priority open.",
    "tags": [
      "Focus",
      "Clarity",
      "Digital Hygiene"
    ],
    "durationEstimateMinutes": 5,
    "sourceType": "habit_idea",
    "rationale": "Single-tasking protects your prefrontal cortex from costly context-switching penalties."
  },
  {
    "id": "sug-inbox-zero-sprint",
    "title": "Check Out Mail: Timeboxed 10-Minute Inbox Triage",
    "kind": "habit",
    "category": "Admin",
    "description": "Aggressively archive newsletters, unsubscribe from promotions, and file pending threads into clear folders.",
    "tags": [
      "Admin",
      "Clarity",
      "Inbox"
    ],
    "durationEstimateMinutes": 10,
    "sourceType": "habit_idea",
    "rationale": "A quiet inbox eliminates the subconscious dread of unresolved obligations."
  },
  {
    "id": "sug-tomorrow-anchor",
    "title": "Anchor Tomorrow's #1 Mission",
    "kind": "habit",
    "category": "Planning",
    "description": "Before stepping away, write down the exact task you will begin with tomorrow morning. Lay out materials.",
    "tags": [
      "Planning",
      "Clarity",
      "Focus"
    ],
    "durationEstimateMinutes": 5,
    "sourceType": "habit_idea",
    "rationale": "Eliminates morning decision fatigue and lets you dive directly into meaningful work."
  },
  {
    "id": "sug-cool-water-splash",
    "title": "Cold Water Sensory Facial Splash",
    "kind": "habit",
    "category": "Wellness",
    "description": "Go to the sink and splash cold water over your face and wrists. Take a slow deep breath.",
    "tags": [
      "Wellness",
      "Health",
      "Reset"
    ],
    "durationEstimateMinutes": 2,
    "sourceType": "habit_idea",
    "rationale": "Stimulates the trigeminal nerve and triggers the mammalian dive reflex to steady heart rate."
  },
  {
    "id": "sug-stretching-shoulder-rolls",
    "title": "Posture Alignment & Shoulder Roll Reset",
    "kind": "habit",
    "category": "Wellness",
    "description": "Stand up. Interlace fingers behind your back, open your chest, and slowly roll your shoulders 5 times backward.",
    "tags": [
      "Wellness",
      "Health",
      "Movement"
    ],
    "durationEstimateMinutes": 3,
    "sourceType": "habit_idea",
    "rationale": "Reverses forward-slumping computer posture and restores diaphragmatic breath capacity."
  },
  {
    "id": "sug-digital-sunset",
    "title": "10% Room Lighting & Micro Digital Sunset",
    "kind": "habit",
    "category": "Wellness",
    "description": "Dim overhead lighting, enable warm night-shift displays, and close high-stimulation apps.",
    "tags": [
      "Wellness",
      "Sleep",
      "Offline",
      "Health"
    ],
    "durationEstimateMinutes": 10,
    "sourceType": "habit_idea",
    "rationale": "Signals the pineal gland to initiate natural melatonin release for restorative deep sleep."
  },
  {
    "id": "sug-calendar-audit",
    "title": "7-Day Calendar Horizon Audit",
    "kind": "habit",
    "category": "Planning",
    "description": "Scan the upcoming 7 days. Spot meeting collision traps, schedule 90-minute focus blocks, and protect downtime.",
    "tags": [
      "Planning",
      "Calendar",
      "Clarity"
    ],
    "durationEstimateMinutes": 10,
    "sourceType": "habit_idea",
    "rationale": "Proactively defending your focus blocks prevents reactive firefighting throughout the week."
  }
];
