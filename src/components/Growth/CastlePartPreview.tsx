import { useEffect, useRef } from 'react';

export function CastlePartPreview({ assetId, label }: { assetId: string; label: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const context = canvas.current?.getContext('2d');
    if (!context) return;
    let cancelled = false;
    void import('./castlePartPreviewRenderer')
      .then(({ drawCastlePartPreview }) => {
        if (!cancelled) drawCastlePartPreview(context, assetId);
      })
      .catch(error => {
        if (!cancelled) console.error('Castle part preview could not be rendered.', error);
      });
    return () => {
      cancelled = true;
    };
  }, [assetId]);
  return <canvas ref={canvas} width={240} height={144}
    className="cp-thumb cp-geometry-preview" role="img" aria-label={`Construction preview: ${label}`} />;
}
