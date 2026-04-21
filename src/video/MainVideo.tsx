import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Img,
  interpolate,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

export interface MainVideoProps {
  clips: Array<{ src: string; isVideo: boolean }>;
  clipTimings: Array<{ startFrame: number; durationFrames: number }>;
  audioSrc: string;
  content: string;
  scenes: Array<{ description: string; narration: string; imagesCount: number }>;
  partNumber: number;
  totalParts: number;
  theme: {
    colorTint: string;
    name: string;
  };
  storyTitle: string;
  hook: string;
}

const WaterMark: React.FC = () => (
  <div
    className="absolute top-6 left-8 flex items-center gap-2 bg-black/60 px-4 py-2 rounded-lg z-10"
    style={{
      fontFamily: "'Cinzel', serif",
      color: '#FFD700',
      fontSize: 22,
      fontWeight: 700,
      letterSpacing: 2,
    }}
  >
    ⚜️ UNTOLD LORES
  </div>
);

const PartBadge: React.FC<{ part: number; total: number }> = ({ part, total }) => (
  <div
    className="absolute top-6 right-8 bg-yellow-400/85 text-black px-5 py-2 rounded-lg z-10"
    style={{ fontFamily: "'Cinzel', serif", fontWeight: 700, fontSize: 20 }}
  >
    Part {part} of {total}
  </div>
);

const KenBurnsImage: React.FC<{ src: string; index: number; duration: number }> = ({
  src,
  index,
  duration,
}) => {
  const frame = useCurrentFrame();
  const progress = Math.min(frame / duration, 1);
  const scale = interpolate(progress, [0, 1], [1.0, 1.08]);
  const translateX = interpolate(progress, [0, 1], [0, index % 2 === 0 ? -20 : 20]);

  return (
    <AbsoluteFill>
      <Img
        src={src}
        className="w-full h-full object-cover"
        style={{ transform: `scale(${scale}) translateX(${translateX}px)` }}
      />
    </AbsoluteFill>
  );
};

const AIDisclosureCard: React.FC = () => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 10, 100, 120], [0, 1, 1, 0], {
    extrapolateRight: 'clamp',
  });
  return (
    <div
      className="absolute bottom-16 left-1/2 -translate-x-1/2 bg-black/75 text-white text-lg px-7 py-2.5 rounded-lg z-20 whitespace-nowrap"
      style={{ opacity }}
    >
      ⚠️ AI-Generated Content | Untold Lores
    </div>
  );
};

export const MainVideo: React.FC<MainVideoProps> = ({
  clips,
  clipTimings,
  audioSrc,
  content,
  scenes,
  partNumber,
  totalParts,
  theme,
  storyTitle,
  hook,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const currentImageIndex = React.useMemo(() => {
    for (let i = 0; i < clipTimings.length; i++) {
      const { startFrame, durationFrames } = clipTimings[i];
      if (frame >= startFrame && frame < startFrame + durationFrames) return i;
    }
    if (clipTimings.length > 0 && frame < clipTimings[0].startFrame) return 0;
    return clips.length - 1;
  }, [frame, clipTimings, clips.length]);

  const currentClipTiming = clipTimings[currentImageIndex];
  const frameInClip = currentClipTiming ? Math.max(0, frame - currentClipTiming.startFrame) : 0;
  const currentClipDuration = currentClipTiming?.durationFrames ?? fps * 10;

  const sceneCaption = React.useMemo(() => {
    // index 0 = intro thumbnail, indices 1..N = scenes, last = hook
    if (currentImageIndex === 0) {
      return `Welcome to Untold Lores. "${storyTitle}" — Part ${partNumber} of 4.`;
    }
    if (!scenes || scenes.length === 0) return '';
    const sceneIdx = currentImageIndex - 1; // shift by 1 to skip intro clip
    if (sceneIdx < scenes.length) return scenes[sceneIdx].narration;
    return '';
  }, [currentImageIndex, scenes, storyTitle, partNumber]);

  const captionFadeFrames = fps * 0.5;
  const captionOpacity = interpolate(
    frameInClip,
    [0, captionFadeFrames, currentClipDuration - captionFadeFrames, currentClipDuration],
    [0, 1, 1, 0],
    { extrapolateRight: 'clamp' }
  );

  const isHookClip = currentImageIndex === clips.length - 1;
  const hookPulse = isHookClip
    ? interpolate(frame % (fps * 0.8), [0, fps * 0.4, fps * 0.8], [0.95, 1.05, 0.95])
    : 1;
  const isLastSection = frame > durationInFrames - fps * 5;

  return (
    <AbsoluteFill className="bg-black">
      {/* Background clips */}
      {clips.map((clip, i) => {
        const timing = clipTimings[i];
        if (!timing) return null;
        const { startFrame, durationFrames } = timing;
        const endFrame = startFrame + durationFrames;
        if (frame < startFrame - fps || frame > endFrame + fps) return null;
        const fadeFrames = Math.min(fps * 0.4, durationFrames * 0.15);
        const opacity = interpolate(
          frame,
          [startFrame, startFrame + fadeFrames, endFrame - fadeFrames, endFrame],
          [0, 1, 1, 0],
          { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
        );
        return (
          <div key={i} className="absolute inset-0" style={{ opacity }}>
            <Sequence from={startFrame} durationInFrames={durationFrames} layout="none">
              <KenBurnsImage src={clip.src} index={i} duration={durationFrames} />
            </Sequence>
          </div>
        );
      })}

      {/* Theme tint */}
      <AbsoluteFill style={{ background: theme.colorTint }} />

      {/* Vignette */}
      <AbsoluteFill
        style={{
          background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.7) 100%)',
        }}
      />

      {/* AI Disclosure */}
      {frame < fps * 4 && <AIDisclosureCard />}

      <WaterMark />
      <PartBadge part={partNumber} total={totalParts} />

      {/* Scene narration caption */}
      {!isHookClip && !isLastSection && sceneCaption && (
        <div
          className="absolute bottom-20 left-0 right-0 text-center bg-black/65 px-12 py-2.5 z-[8]"
          style={{ opacity: captionOpacity }}
        >
          <p
            className="text-4xl font-semibold tracking-wide"
            style={{
              fontFamily: "'Cinzel', serif",
              color: '#FFD700',
              textShadow: '0 1px 6px rgba(0,0,0,1)',
            }}
          >
            {sceneCaption}
          </p>
        </div>
      )}

      {/* Hook — pulsing near end */}
      {isHookClip && !isLastSection && (
        <div
          className="absolute bottom-28 left-20 right-20 text-center"
          style={{
            fontFamily: "'Cinzel', serif",
            color: '#FFD700',
            fontSize: 36,
            fontWeight: 700,
            lineHeight: 1.5,
            textShadow: '0 2px 12px rgba(0,0,0,1)',
            transform: `scale(${hookPulse})`,
          }}
        >
          {hook}
        </div>
      )}

      {/* Final CTA */}
      {isLastSection && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 gap-4 text-center"
          style={{ fontFamily: "'Cinzel', serif", color: '#FFD700', fontSize: 36, fontWeight: 700 }}
        >
          <div>⚜️ UNTOLD LORES</div>
          <div className="text-2xl text-white">
            Follow & Subscribe for Part {Math.min(partNumber + 1, totalParts)}
          </div>
        </div>
      )}

      <Audio src={audioSrc} />
    </AbsoluteFill>
  );
};
