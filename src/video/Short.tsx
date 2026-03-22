import React from 'react';
import { AbsoluteFill, Audio, Img, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';

export interface ShortProps {
  images: string[];
  shortAudioSrc: string;
  hook: string;
  theme: {
    colorTint: string;
    name: string;
    particleEffect: string;
  };
}

const Particle: React.FC<{ x: number; y: number; frame: number; type: string }> = ({ x, y, frame, type }) => {
  const offset = (frame * 0.5 + x * 7) % 100;
  const opacity = interpolate(offset, [0, 30, 70, 100], [0, 0.6, 0.6, 0]);
  const colors: Record<string, string> = {
    dust: 'rgba(200,200,200,0.5)',
    petals: 'rgba(255,182,193,0.7)',
    smoke: 'rgba(150,150,150,0.4)',
    gold: 'rgba(255,215,0,0.7)',
    sparkles: 'rgba(180,0,255,0.7)',
  };
  return (
    <div
      className="absolute rounded-full"
      style={{
        left: `${x}%`,
        top: `${(y + offset * 0.3) % 110}%`,
        width: type === 'sparkles' ? 6 : 4,
        height: type === 'sparkles' ? 6 : 4,
        background: colors[type] || 'white',
        opacity,
      }}
    />
  );
};

export const Short: React.FC<ShortProps> = ({ images, shortAudioSrc, hook, theme }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const framesPerImage = fps * 3;

  const words = hook.split(' ');
  const wordRevealFrame = fps * 3;
  const visibleWords = Math.min(
    Math.floor(Math.max(0, frame - wordRevealFrame) / (fps / 2)),
    words.length
  );

  const isEnd = frame > durationInFrames - fps * 2;
  const audioFade = isEnd ? interpolate(frame, [durationInFrames - fps * 2, durationInFrames], [1, 0]) : 1;
  const particles = Array.from({ length: 12 }, (_, i) => ({ x: (i * 8.33) % 100, y: (i * 15) % 100 }));

  return (
    <AbsoluteFill className="bg-black">
      {/* Images — top 60% */}
      <div className="absolute top-0 left-0 right-0 overflow-hidden" style={{ height: '60%' }}>
        {images.map((src, i) => {
          const startFrame = i * framesPerImage;
          const endFrame = startFrame + framesPerImage;
          const opacity = interpolate(
            frame,
            [startFrame, startFrame + fps * 0.3, endFrame - fps * 0.3, endFrame],
            [0, 1, 1, 0],
            { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
          );
          const scale = interpolate(frame - startFrame, [0, framesPerImage], [1.0, 1.06]);
          return (
            <div key={i} className="absolute inset-0" style={{ opacity }}>
              <Img src={src} className="w-full h-full object-cover" style={{ transform: `scale(${scale})` }} />
            </div>
          );
        })}
        <div className="absolute inset-0" style={{ background: theme.colorTint }} />
        <div className="absolute bottom-0 left-0 right-0 h-2/5" style={{ background: 'linear-gradient(transparent, #000)' }} />
      </div>

      {/* Hook text — middle 22% */}
      <div className="absolute left-0 right-0 flex items-center justify-center px-8" style={{ top: '58%', height: '22%' }}>
        <p
          className="text-center font-bold leading-snug"
          style={{ fontFamily: "'Cinzel', serif", color: '#fff', fontSize: 38, textShadow: '0 2px 16px rgba(0,0,0,1)' }}
        >
          {words.slice(0, visibleWords).join(' ')}
        </p>
      </div>

      {/* Branding — bottom 20% */}
      <div className="absolute bottom-0 left-0 right-0 flex flex-col items-center justify-center gap-2.5 bg-black/80" style={{ height: '20%' }}>
        <div
          className="font-bold tracking-widest"
          style={{ fontFamily: "'Cinzel', serif", color: '#FFD700', fontSize: 28 }}
        >
          ⚜️ UNTOLD LORES
        </div>
        <div
          style={{
            fontFamily: "'Cinzel', serif", color: '#fff', fontSize: 22,
            transform: `scale(${interpolate(frame % (fps * 1.2), [0, fps * 0.6, fps * 1.2], [1, 1.06, 1])})`,
          }}
        >
          Follow for Full Story 👆
        </div>
      </div>

      {/* Particles */}
      {particles.map((p, i) => (
        <Particle key={i} x={p.x} y={p.y} frame={frame} type={theme.particleEffect} />
      ))}

      {/* Vignette */}
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.75) 100%)', pointerEvents: 'none' }} />

      {/* AI Disclosure */}
      {frame < fps * 2 && (
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/85 text-white text-xl px-7 py-3 rounded-lg z-30"
          style={{ opacity: interpolate(frame, [0, 20, fps * 1.5, fps * 2], [0, 1, 1, 0], { extrapolateRight: 'clamp' }) }}
        >
          ⚠️ AI Content | Untold Lores
        </div>
      )}

      <Audio src={shortAudioSrc} volume={audioFade * 0.85} />
    </AbsoluteFill>
  );
};
