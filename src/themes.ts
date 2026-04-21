export interface Theme {
  id: string;
  name: string;
  stylePrompt: string;
  voiceTone: string;
  facebookHashtags: string;
  youtubeTags: string;
  cliffhangerStyle: string;
  thumbnailMood: string;
  shortHookStyle: string;
  videoMood: string;
  colorTint: string;
  themeColor: string;
  particleEffect: string;
  leadIn: string;
  exampleOpenings: string[];
  themeLabel: string;
  themeEmoji: string;
}

export const THEMES: Theme[] = [
  {
    id: 'horror_thriller',
    name: 'Horror & Thriller',
    stylePrompt:
      'anime art style, soft volumetric lighting, warm inner glow, dark atmospheric background, expressive facial features, rich deep colors, dramatic shadows, high quality illustration, 8k, cinematic composition, blood, fog, ghostly spirits, moonlight',
    voiceTone: 'slow and suspenseful, whispering tone, dramatic pauses',
    facebookHashtags: '#horror #thriller #scarystory #horrorstory #scary #storytime #UntoldLores',
    youtubeTags:
      'horror story, thriller, scary story, horror narration, animated horror, untold lores, story time, horror 2026',
    cliffhangerStyle:
      'End each part with a terrifying revelation that makes it impossible not to watch the next part',
    thumbnailMood: 'terrifying, dark, blood red accents, wide eyes, shocked expression',
    shortHookStyle: 'whispered, slow build, sudden shocking final line',
    videoMood: 'dark, tense, unsettling',
    colorTint: 'rgba(10, 10, 46, 0.20)',
    themeColor: '#1a0000',
    particleEffect: 'dust',
    leadIn: 'And then... he realized...',
    themeLabel: 'HORROR',
    themeEmoji: '🔴',
    exampleOpenings: [
      'He checked on the children at midnight. The beds were empty. But he could hear them laughing downstairs.',
      'He had been receiving voicemails from his dead father for three weeks.',
      'The new neighbor introduced himself. He recognized him immediately — from his nightmares.',
    ],
  },
  {
    id: 'drama_betrayal',
    name: 'Drama & Betrayal',
    stylePrompt:
      'anime art style, soft volumetric lighting, warm inner glow, dark atmospheric background, expressive facial features, rich deep colors, dramatic shadows, high quality illustration, 8k, cinematic composition, tears, palace interior, candlelight',
    voiceTone: 'emotional and intense, dramatic pauses at shocking moments',
    facebookHashtags: '#drama #storytime #betrayal #relationship #shocking #mustread #UntoldLores',
    youtubeTags:
      'drama story, betrayal, relationship story, emotional story, animated drama, untold lores, story time, shocking story',
    cliffhangerStyle: 'End each part with a shocking betrayal reveal, emotional gut-punch, or the moment the betrayer gets publicly exposed and destroyed',
    thumbnailMood: 'tearful, shocked, dramatic close-up, warm amber tones',
    shortHookStyle: 'emotional build, voice breaking, devastating final reveal — or a satisfying face-slap moment where the audience cheers',
    videoMood: 'emotional, intense, dramatic',
    colorTint: 'rgba(255, 140, 0, 0.10)',
    themeColor: '#1a0800',
    particleEffect: 'petals',
    leadIn: "That's when everything fell apart...",
    themeLabel: 'DRAMA',
    themeEmoji: '💔',
    exampleOpenings: [
      'He found the messages on her phone. The hotel. The same night she told him she was working late.',
      'My best friend of 20 years just testified against me in court. This is what really happened.',
      'He proposed in Paris. What he did not know was that her other boyfriend was waiting at the airport.',
      'She humiliated me in front of 300 wedding guests. So I waited. And I made sure everyone found out the truth.',
      'My sister stole my identity, my savings, and my fiancé. Then she invited me to her wedding.',
      'They fired me on my birthday and laughed. Six months later I bought the company.',
    ],
  },
  {
    id: 'motivational_underdog',
    name: 'Motivational Underdog',
    stylePrompt:
      'anime art style, soft volumetric lighting, warm inner glow, dark atmospheric background, expressive facial features, rich deep colors, dramatic shadows, high quality illustration, 8k, cinematic composition, golden sunrise, triumph, dynamic action pose',
    voiceTone: 'powerful and inspiring, building energy, emotional peaks',
    facebookHashtags:
      '#motivation #inspiration #success #nevergiveup #mindset #storytime #UntoldLores',
    youtubeTags:
      'motivational story, inspiration, success story, underdog, animated motivation, untold lores, never give up, true story',
    cliffhangerStyle: 'End each part at the lowest point, the highest triumph, or the face-slap moment where everyone who doubted them watches them win in public',
    thumbnailMood: 'triumphant, golden light, determined face, rising sun, powerful pose',
    shortHookStyle: 'building crescendo, powerful voice, triumphant final line — or a face-slap reveal that makes the audience want to stand up and cheer',
    videoMood: 'inspiring, uplifting, emotional',
    colorTint: 'rgba(255, 215, 0, 0.10)',
    themeColor: '#1a1400',
    particleEffect: 'gold',
    leadIn: 'That was the moment he understood...',
    themeLabel: 'MOTIVATION',
    themeEmoji: '⚡',
    exampleOpenings: [
      'At 38, he lost his job, his house, and his family in the same month. Three years later he employs 200 people.',
      'He was told he would never walk again. He ran a marathon 18 months later.',
      'Everyone in his village laughed when he said he would go to university. He went to Oxford.',
      'My boss told me I was too stupid to ever lead a team. I became his boss two years later.',
      'They cut me from the team and gave my spot to the coach\'s nephew. I made it to the national team. He didn\'t.',
      'She laughed when I said I\'d pay back every cent. I handed her a check in front of the same people who watched her humiliate me.',
    ],
  },
  {
    id: 'dark_fantasy',
    name: 'Dark Fantasy Adventure',
    stylePrompt:
      'anime art style, soft volumetric lighting, warm inner glow, dark atmospheric background, expressive facial features, rich deep colors, dramatic shadows, high quality illustration, 8k, cinematic composition, magic particles, dragons, ancient temple, swords',
    voiceTone: 'epic and theatrical, grand storytelling tone',
    facebookHashtags: '#fantasy #darkfantasy #adventure #magic #storytime #epicstory #UntoldLores',
    youtubeTags:
      'dark fantasy, fantasy story, adventure, magic, animated fantasy, untold lores, epic story, fantasy narration',
    cliffhangerStyle: 'End each part with a shocking power reveal or world-changing event',
    thumbnailMood: 'epic, magical, glowing elements, dramatic pose, purple mystical tones',
    shortHookStyle: 'epic orchestral feel, grand voice, world-shattering final reveal',
    videoMood: 'epic, mystical, grand',
    colorTint: 'rgba(45, 0, 87, 0.15)',
    themeColor: '#0d001a',
    particleEffect: 'sparkles',
    leadIn: 'And in that instant, everything changed...',
    themeLabel: 'FANTASY',
    themeEmoji: '✨',
    exampleOpenings: [
      'The kingdom had been at peace for 100 years. The peace ended the night he was born.',
      'He was the last dragon hunter. Until the day he discovered he was half dragon.',
      'Magic had been forbidden for a century. He had been using it his whole life without knowing.',
    ],
  },
];

export function getThemeById(id: string): Theme {
  const theme = THEMES.find((t) => t.id === id);
  if (!theme) throw new Error(`Theme not found: ${id}`);
  return theme;
}

export function getThemeByIndex(index: number): Theme {
  return THEMES[index % THEMES.length];
}
