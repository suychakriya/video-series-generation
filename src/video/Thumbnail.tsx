import React from 'react';
import { AbsoluteFill, Img } from 'remotion';

export interface ThumbnailProps {
  dramaticImageUrl: string;
  thumbnailTitle: string;
  partNumber: number;
  totalParts: number;
  theme: {
    themeColor: string;
    name: string;
    themeLabel: string;
    themeEmoji: string;
  };
}

export const Thumbnail: React.FC<ThumbnailProps> = ({
  dramaticImageUrl, thumbnailTitle, partNumber, totalParts, theme,
}) => {
  return (
    <AbsoluteFill style={{ background: theme.themeColor, fontFamily: "'Cinzel', serif" }}>
      {/* Left — Dramatic image (50%) */}
      <div className="absolute left-0 top-0 w-1/2 h-full overflow-hidden">
        <Img
          src={dramaticImageUrl}
          className="h-full object-cover object-top"
          style={{ width: '110%', transform: 'scale(1.05)' }}
        />
        <div
          className="absolute top-0 right-0 w-2/5 h-full"
          style={{ background: `linear-gradient(to right, transparent, ${theme.themeColor})` }}
        />
      </div>

      {/* Right — Text (52%) */}
      <div className="absolute right-0 top-0 w-[52%] h-full flex flex-col justify-center items-start gap-5"
        style={{ padding: '60px 48px 60px 24px' }}
      >
        <div
          className="font-black leading-tight tracking-wide"
          style={{
            color: '#fff', fontSize: 72, lineHeight: 1.15,
            textShadow: '4px 4px 0 #000, -1px -1px 0 rgba(0,0,0,0.5)',
            WebkitTextStroke: '1px rgba(255,215,0,0.6)',
          }}
        >
          {thumbnailTitle.toUpperCase()}
        </div>
      </div>

      {/* Top strip */}
      <div className="absolute top-0 left-0 right-0 h-[52px] bg-black/[0.72] flex items-center justify-between px-6 z-10">
        <span className="font-bold tracking-widest" style={{ color: '#FFD700', fontSize: 18 }}>
          ⚜️ UNTOLD LORES
        </span>
        <span className="bg-yellow-400 text-black font-bold px-3.5 py-1 rounded-md" style={{ fontSize: 15 }}>
          Part {partNumber} of {totalParts}
        </span>
      </div>

      {/* Bottom strip */}
      <div className="absolute bottom-0 left-0 right-0 h-[52px] bg-black/[0.72] flex items-center px-6 z-10">
        <span
          className="font-bold tracking-widest rounded-full border border-white/30 px-4 py-1.5"
          style={{ background: theme.themeColor, color: '#fff', fontSize: 16 }}
        >
          {theme.themeEmoji} {theme.themeLabel}
        </span>
      </div>
    </AbsoluteFill>
  );
};
