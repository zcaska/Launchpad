import React, { useRef, useState } from 'react';
import { useFeatureGuide } from './FeatureGuideContext';

export interface GuideTargetProps {
  id: string;
  children: React.ReactNode;
  className?: string;
  hoverLabel?: string;
  hoverPosition?: 'top' | 'bottom' | 'left' | 'right';
}

export const GuideTarget: React.FC<GuideTargetProps> = ({
  id,
  children,
  className = '',
  hoverLabel,
  hoverPosition = 'bottom',
}) => {
  const { toggleGuide } = useFeatureGuide(false);
  const [isHovered, setIsHovered] = useState(false);
  const touchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const targetRef = useRef<HTMLDivElement>(null);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (targetRef.current) {
      toggleGuide(id, targetRef.current);
    }
  };

  // Touch long-press support (500ms) for mobile
  const handleTouchStart = () => {
    touchTimerRef.current = setTimeout(() => {
      if (targetRef.current) {
        toggleGuide(id, targetRef.current);
      }
    }, 500);
  };

  const handleTouchEndOrMove = () => {
    if (touchTimerRef.current) {
      clearTimeout(touchTimerRef.current);
      touchTimerRef.current = null;
    }
  };

  const tooltipPositionClass = {
    top: 'bottom-full mb-1.5 left-1/2 -translate-x-1/2',
    bottom: 'top-full mt-1.5 left-1/2 -translate-x-1/2',
    left: 'right-full mr-1.5 top-1/2 -translate-y-1/2',
    right: 'left-full ml-1.5 top-1/2 -translate-y-1/2',
  }[hoverPosition];

  return (
    <div
      ref={targetRef}
      data-guide-id={id}
      onContextMenu={handleContextMenu}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEndOrMove}
      onTouchMove={handleTouchEndOrMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`relative inline-flex items-center ${className}`}
    >
      {children}
      {hoverLabel && isHovered && (
        <span
          role="tooltip"
          className={`pointer-events-none absolute ${tooltipPositionClass} z-40 hidden md:inline-flex items-center whitespace-nowrap rounded-lg px-2 py-0.5 text-[11px] font-semibold tracking-wide bg-gray-900/90 text-white dark:bg-white/95 dark:text-gray-900 shadow-lg backdrop-blur-sm transition-opacity duration-150 animate-in fade-in select-none`}
        >
          {hoverLabel}
        </span>
      )}
    </div>
  );
};
