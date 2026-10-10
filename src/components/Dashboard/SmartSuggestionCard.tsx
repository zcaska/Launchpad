import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  Check, 
  RotateCw, 
  ExternalLink, 
  Clock, 
  Zap, 
  Globe, 
  Lightbulb
} from 'lucide-react';
import { RecommendationCandidate } from '../../types';
import { extractDomain, getFaviconUrl } from '../../utils/favicon';
import { fadeScaleVariants } from '../../utils/motion';

interface SmartSuggestionCardProps {
  candidate: RecommendationCandidate | null;
  onApprove: (candidate: RecommendationCandidate) => void;
  onReject: (candidate: RecommendationCandidate) => void;
  onFetchAiIdea?: () => void;
  isOpenRouterEnabled?: boolean;
  isAiLoading?: boolean;
  approvalsCount: number;
  rejectionsCount: number;
}

export const SmartSuggestionCard: React.FC<SmartSuggestionCardProps> = ({
  candidate,
  onApprove,
  onReject,
  onFetchAiIdea,
  isOpenRouterEnabled = false,
  isAiLoading = false,
  approvalsCount,
  rejectionsCount,
}) => {
  const [isApproving, setIsApproving] = useState(false);

  if (!candidate) {
    return (
      <div className="p-6 rounded-2xl bg-white dark:bg-serene-surface-dark border border-serene-border-light dark:border-serene-border-dark text-center space-y-3">
        <Sparkles className="w-8 h-8 mx-auto text-amber-500" />
        <h3 className="text-sm font-bold text-serene-text-primary dark:text-serene-text-darkPrimary">
          Great job! All focus recommendations explored.
        </h3>
        <p className="text-xs text-serene-text-muted max-w-md mx-auto">
          Add more articles to your Reading List or bookmarks to train your recommendation engine.
        </p>
      </div>
    );
  }

  const domain = extractDomain(candidate.url);
  const faviconUrl = getFaviconUrl(candidate.url, 32);

  const handleApproveClick = () => {
    setIsApproving(true);
    onApprove(candidate);
    window.open(candidate.url, '_blank', 'noopener,noreferrer');
    setTimeout(() => setIsApproving(false), 500);
  };

  const handleRejectClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onReject(candidate);
  };

  return (
    <div className="@container relative overflow-hidden bg-gradient-to-br from-serene-primary/5 via-white to-serene-secondary/5 dark:from-serene-primary/10 dark:via-serene-surface-dark dark:to-serene-secondary/10 border-2 border-serene-primary/30 dark:border-serene-primary/40 rounded-2xl p-4 sm:p-5 shadow-card hover:shadow-card-hover transition-all animate-fadeIn">
      {/* Top Banner Tag: AI / Algorithmic recommendation indicator */}
      <div className="flex flex-col @sm:flex-row @sm:items-center justify-between gap-2.5 mb-3.5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="p-1 rounded-lg bg-serene-primary-soft dark:bg-serene-primary/20 text-serene-primary dark:text-serene-primary-dark shrink-0">
            <Lightbulb className="w-4 h-4" />
          </span>
          <span className="text-xs font-bold uppercase tracking-wider text-serene-primary dark:text-serene-primary-dark">
            Smart Focus Alternative
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-serene-primary-soft dark:bg-serene-primary/20 text-serene-primary dark:text-serene-primary-dark font-mono font-medium">
            Learned from {approvalsCount + rejectionsCount} signals
          </span>
        </div>

        {/* Time estimate badge */}
        <div className="flex items-center gap-1.5 text-xs font-semibold text-serene-text-secondary dark:text-serene-text-darkSecondary shrink-0">
          <Clock className="w-3.5 h-3.5 text-serene-text-muted" />
          <span>~{candidate.durationEstimateMinutes} min focus</span>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={candidate.id}
          variants={fadeScaleVariants}
          initial="initial"
          animate="animate"
          exit="exit"
        >
          {/* Rationale Quote */}
          <div className="p-2.5 rounded-xl bg-white/80 dark:bg-serene-surface-dark/80 border border-serene-border-light dark:border-serene-border-dark text-xs text-serene-text-secondary dark:text-serene-text-darkSecondary mb-4 flex items-start gap-2 shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
            <span className="leading-relaxed italic break-words">{candidate.rationale}</span>
          </div>

          {/* Main Candidate Card Item */}
          <div className="flex flex-col @lg:flex-row @lg:items-center justify-between gap-3.5 sm:gap-4 p-3.5 sm:p-4 rounded-xl bg-white dark:bg-serene-surface-dark border border-serene-border-light dark:border-serene-border-dark shadow-subtle">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              {/* Favicon */}
              <div className="w-10 h-10 rounded-xl bg-serene-surfaceAlt-light dark:bg-serene-surfaceAlt-dark border border-serene-border-light/60 dark:border-serene-border-dark flex items-center justify-center shrink-0 overflow-hidden shadow-2xs">
                {faviconUrl ? (
                  <img
                    src={faviconUrl}
                    alt=""
                    className="w-5 h-5 object-contain"
                    onError={(e) => {
                      (e.currentTarget as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <Globe className="w-5 h-5 text-serene-text-muted" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <h4 className="text-sm font-bold text-serene-text-primary dark:text-serene-text-darkPrimary leading-snug break-words">
                  {candidate.title}
                </h4>
                {candidate.description && (
                  <p className="text-xs text-serene-text-secondary dark:text-serene-text-darkSecondary mt-1 leading-relaxed line-clamp-2 break-words">
                    {candidate.description}
                  </p>
                )}
                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                  <span className="text-[10px] font-mono text-serene-text-muted bg-serene-surfaceAlt-light dark:bg-serene-surfaceAlt-dark px-1.5 py-0.5 rounded border border-serene-border-light dark:border-serene-border-dark">
                    {domain}
                  </span>
                  {candidate.tags.slice(0, 3).map((tag, idx) => (
                    <span
                      key={idx}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-serene-primary-soft dark:bg-serene-primary/20 text-serene-primary dark:text-serene-primary-dark font-medium"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Action Controls: Responsive layout - 2 equal columns when stacked, flex row when side-by-side */}
            <div className="grid grid-cols-2 @lg:flex @lg:items-center gap-2 shrink-0 pt-2.5 @lg:pt-0 border-t @lg:border-t-0 border-serene-border-light/50 dark:border-serene-border-dark/50">
              {/* Reject button */}
              <button
                onClick={handleRejectClick}
                title="Not feeling this right now (Press 'R')"
                className="w-full @lg:w-auto px-3 py-2 bg-serene-surfaceAlt-light dark:bg-serene-surfaceAlt-dark hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:text-rose-600 dark:hover:text-rose-400 border border-serene-border-light dark:border-serene-border-dark text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5 text-center"
              >
                <RotateCw className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Another (R)</span>
              </button>

              {/* Approve button */}
              <button
                onClick={handleApproveClick}
                title="Start this activity (Press 'Enter')"
                className="w-full @lg:w-auto px-4 py-2 bg-serene-primary hover:bg-serene-primary-hover text-white text-xs font-semibold rounded-xl shadow-sm hover:shadow transition-all flex items-center justify-center gap-1.5 text-center"
              >
                {isApproving ? <Check className="w-3.5 h-3.5 shrink-0" /> : <ExternalLink className="w-3.5 h-3.5 shrink-0" />}
                <span className="truncate">Approve & Open</span>
              </button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* AI Discovery fallback option */}
      {isOpenRouterEnabled && onFetchAiIdea && (
        <div className="mt-3 pt-2 border-t border-serene-border-light/40 dark:border-serene-border-dark/40 flex items-center justify-between text-[11px] text-serene-text-muted">
          <span>Want an AI-discovered web idea?</span>
          <button
            onClick={onFetchAiIdea}
            disabled={isAiLoading}
            className="text-serene-primary dark:text-serene-primary-dark hover:underline font-semibold flex items-center gap-1"
          >
            <Zap className="w-3 h-3 text-amber-500" />
            <span>{isAiLoading ? 'Discovering...' : 'Fetch AI Web Idea'}</span>
          </button>
        </div>
      )}
    </div>
  );
};
