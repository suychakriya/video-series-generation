import React from 'react';
import './style.css';
import { Composition, registerRoot } from 'remotion';
import { MainVideo } from './MainVideo';
import { Short } from './Short';
import { Thumbnail } from './Thumbnail';
import { FacebookVideo } from './FacebookVideo';

const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="MainVideo"
        component={MainVideo as unknown as React.FC<Record<string, unknown>>}
        durationInFrames={18000}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          clips: [],
          clipTimings: [],
          audioSrc: '',
          content: '',
          scenes: [],
          partNumber: 1,
          totalParts: 4,
          theme: { colorTint: 'rgba(0,0,0,0.2)', name: 'Horror' },
          storyTitle: '',
          hook: '',
        }}
      />
      <Composition
        id="Short"
        component={Short as unknown as React.FC<Record<string, unknown>>}
        durationInFrames={1800}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{
          images: [],
          shortAudioSrc: '',
          hook: '',
          theme: { colorTint: 'rgba(0,0,0,0.2)', name: 'Horror', particleEffect: 'dust' },
        }}
      />
      <Composition
        id="FacebookVideo"
        component={FacebookVideo as unknown as React.FC<Record<string, unknown>>}
        durationInFrames={18000}
        fps={30}
        width={1080}
        height={1350}
        defaultProps={{
          clips: [],
          clipTimings: [],
          audioSrc: '',
          audioStartFrames: [],
          scenes: [],
          partNumber: 1,
          totalParts: 4,
          theme: { colorTint: 'rgba(0,0,0,0.2)', name: 'Horror' },
          storyTitle: '',
          hook: '',
        }}
      />
      <Composition
        id="Thumbnail"
        component={Thumbnail as unknown as React.FC<Record<string, unknown>>}
        durationInFrames={1}
        fps={30}
        width={1280}
        height={720}
        defaultProps={{
          dramaticImageUrl: '',
          thumbnailTitle: '',
          partNumber: 1,
          totalParts: 4,
          theme: {
            themeColor: '#1a0000',
            name: 'Horror',
            themeLabel: 'HORROR',
            themeEmoji: '🔴',
          },
        }}
      />
    </>
  );
};

registerRoot(RemotionRoot);
