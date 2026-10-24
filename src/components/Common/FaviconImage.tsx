import React, { useState, useEffect } from 'react';
import {
  Globe
} from '@phosphor-icons/react';
import { getFaviconUrl, getApexFaviconUrl } from '../../utils/favicon';

interface FaviconImageProps {
  url: string;
  alt?: string;
  size?: number;
  className?: string;
  iconClassName?: string;
  wrapperClassName?: string;
}

export const FaviconImage: React.FC<FaviconImageProps> = ({
  url,
  alt = '',
  size = 64,
  className = 'w-full h-full object-contain pointer-events-none',
  iconClassName = 'w-full h-full text-serene-text-secondary dark:text-serene-text-darkSecondary',
  wrapperClassName = 'w-full h-full flex items-center justify-center',
}) => {
  // stage: 0 = primary modern google favicon, 1 = fallback apex google s2, 2 = Globe fallback
  const [stage, setStage] = useState<0 | 1 | 2>(0);

  // Reset stage when url changes
  useEffect(() => {
    setStage(0);
  }, [url]);

  const primaryUrl = getFaviconUrl(url, size);
  const apexUrl = getApexFaviconUrl(url, size);

  if (stage === 0 && primaryUrl) {
    return (
      <div className={wrapperClassName}>
        <img
          src={primaryUrl}
          alt={alt}
          className={className}
          loading="lazy"
          onError={() => {
            if (apexUrl && apexUrl !== primaryUrl) {
              setStage(1);
            } else {
              setStage(2);
            }
          }}
        />
      </div>
    );
  }

  if (stage <= 1 && apexUrl) {
    return (
      <div className={wrapperClassName}>
        <img
          src={apexUrl}
          alt={alt}
          className={className}
          loading="lazy"
          onError={() => {
            setStage(2);
          }}
        />
      </div>
    );
  }

  return (
    <div className={wrapperClassName}>
      <Globe className={iconClassName} />
    </div>
  );
};
