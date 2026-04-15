import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Img,
  Video,
  interpolate,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

export interface FacebookVideoProps {
  clips: Array<{ src: string; isVideo: boolean }>;
  clipTimings: Array<{ startFrame: number; durationFrames: number }>;
  audioSrc: string;
  scenes: Array<{ narration: string }>;
  partNumber: number;
  totalParts: number;
  theme: { colorTint: string; name: string };
  storyTitle: string;
  hook: string;
}

const cinzel: React.CSSProperties = { fontFamily: "'Cinzel', serif" };
const gold = '#FFD700';

const KenBurnsImage: React.FC<{ src: string; index: number; duration: number }> = ({
  src,
  index,
  duration,
}) => {
  const frame = useCurrentFrame();
  const progress = Math.min(frame / duration, 1);
  const scale = interpolate(progress, [0, 1], [1.0, 1.08]);
  const translateX = interpolate(progress, [0, 1], [0, index % 2 === 0 ? -15 : 15]);

  return (
    <div className="w-full h-full overflow-hidden">
      <Img
        src={src}
        className="w-full h-full object-cover"
        style={{ transform: `scale(${scale}) translateX(${translateX}px)` }}
      />
    </div>
  );
};

export const FacebookVideo: React.FC<FacebookVideoProps> = ({
  clips,
  clipTimings,
  audioSrc,
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

  const isHookClip = currentImageIndex === clips.length - 1;
  const isLastSection = frame > durationInFrames - fps * 5;

  const sceneCaption = React.useMemo(() => {
    if (currentImageIndex === 0) return `"${storyTitle}" — Part ${partNumber} of ${totalParts}`;
    const sceneIdx = currentImageIndex - 1;
    if (sceneIdx < scenes.length) return scenes[sceneIdx].narration;
    return '';
  }, [currentImageIndex, scenes, storyTitle, partNumber, totalParts]);

  const captionFadeFrames = fps * 0.5;
  const captionOpacity = interpolate(
    frameInClip,
    [0, captionFadeFrames, currentClipDuration - captionFadeFrames, currentClipDuration],
    [0, 1, 1, 0],
    { extrapolateRight: 'clamp' }
  );

  const hookPulse = isHookClip
    ? interpolate(frame % (fps * 0.8), [0, fps * 0.4, fps * 0.8], [0.95, 1.05, 0.95])
    : 1;

  const aiOpacity = interpolate(frame, [0, 10, 100, 120], [0, 1, 1, 0], {
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill className="bg-black flex flex-col">
      {/* TOP 68%: Image area */}
      <div className="relative overflow-hidden" style={{ height: '68%' }}>
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
                {clip.isVideo ? (
                  <Video
                    src={clip.src}
                    className="w-full h-full object-cover"
                    playbackRate={1}
                    volume={0}
                  />
                ) : (
                  <KenBurnsImage src={clip.src} index={i} duration={durationFrames} />
                )}
              </Sequence>
            </div>
          );
        })}

        {/* Theme tint */}
        <AbsoluteFill style={{ background: theme.colorTint }} />

        {/* Vignette */}
        <AbsoluteFill
          style={{
            background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.6) 100%)',
          }}
        />

        {/* Watermark */}
        <div
          className="absolute top-5 left-6 flex items-center gap-2 bg-black/60 px-4 py-2 rounded-lg z-10 font-bold tracking-widest text-2xl"
          style={{ ...cinzel, color: gold }}
        >
          ⚜️ UNTOLD LORES
        </div>

        {/* Part badge */}
        <div
          className="absolute top-5 right-6 bg-yellow-400/85 text-black font-bold px-5 py-2 rounded-lg z-10 text-xl"
          style={cinzel}
        >
          Part {partNumber} of {totalParts}
        </div>

        {/* AI disclosure */}
        {frame < fps * 4 && (
          <div
            className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/75 text-white text-lg px-6 py-2 rounded-lg z-20 whitespace-nowrap"
            style={{ opacity: aiOpacity }}
          >
            ⚠️ AI-Generated Content | Untold Lores
          </div>
        )}
      </div>

      {/* BOTTOM 32%: Caption panel */}
      <div
        className="flex items-center justify-center px-10 border-t-2 border-yellow-400/30 relative z-10"
        style={{
          height: '32%',
          background: 'linear-gradient(180deg, #0a0a0a 0%, #1a0a00 100%)',
        }}
      >
        {/* Scene caption */}
        {!isHookClip && !isLastSection && sceneCaption && (
          <p
            className="text-center leading-relaxed m-0 font-semibold"
            style={{
              ...cinzel,
              color: gold,
              fontSize: 34,
              textShadow: '0 1px 6px rgba(0,0,0,1)',
              opacity: captionOpacity,
            }}
          >
            {sceneCaption}
          </p>
        )}

        {/* Hook */}
        {isHookClip && !isLastSection && (
          <p
            className="text-center leading-normal m-0 font-bold"
            style={{
              ...cinzel,
              color: gold,
              fontSize: 34,
              textShadow: '0 2px 12px rgba(0,0,0,1)',
              transform: `scale(${hookPulse})`,
            }}
          >
            {hook}
          </p>
        )}

        {/* Final CTA */}
        {isLastSection && (
          <div className="text-center">
            <div className="font-bold" style={{ ...cinzel, color: gold, fontSize: 36 }}>
              ⚜️ UNTOLD LORES
            </div>
            <div className="mt-2 text-white" style={{ ...cinzel, fontSize: 28 }}>
              Follow for Part {Math.min(partNumber + 1, totalParts)}
            </div>
          </div>
        )}
      </div>

      <Audio src={audioSrc} />
    </AbsoluteFill>
  );
};
