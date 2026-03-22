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
      'Chinese anime donghua art style, soft volumetric lighting, warm inner glow, traditional hanfu clothing, dark atmospheric background, delicate facial features, rich deep colors, dramatic shadows, high quality illustration, 8k, cinematic composition, blood, fog, ghostly spirits, moonlight',
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
      'Chinese anime donghua art style, soft volumetric lighting, warm inner glow, traditional hanfu clothing, dark atmospheric background, delicate facial features, rich deep colors, dramatic shadows, high quality illustration, 8k, cinematic composition, tears, palace interior, candlelight',
    voiceTone: 'emotional and intense, dramatic pauses at shocking moments',
    facebookHashtags: '#drama #storytime #betrayal #relationship #shocking #mustread #UntoldLores',
    youtubeTags:
      'drama story, betrayal, relationship story, emotional story, animated drama, untold lores, story time, shocking story',
    cliffhangerStyle: 'End each part with a shocking betrayal reveal or emotional gut-punch',
    thumbnailMood: 'tearful, shocked, dramatic close-up, warm amber tones',
    shortHookStyle: 'emotional build, voice breaking, devastating final reveal',
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
    ],
  },
  {
    id: 'true_crime_mystery',
    name: 'True Crime Mystery',
    stylePrompt:
      'Chinese anime donghua art style, soft volumetric lighting, warm inner glow, traditional hanfu clothing, dark atmospheric background, delicate facial features, rich deep colors, dramatic shadows, high quality illustration, 8k, cinematic composition, dark streets, lanterns, rain, shadows',
    voiceTone: 'serious and investigative, slow deliberate pacing, documentary style',
    facebookHashtags: '#truecrime #mystery #crime #detective #unsolved #crimestory #UntoldLores',
    youtubeTags:
      'true crime, mystery, crime story, detective, unsolved mystery, animated mystery, untold lores, crime narration',
    cliffhangerStyle: 'End each part with a new clue or twist that reframes everything',
    thumbnailMood: 'mysterious, dark noir, shadowy figure, magnifying glass, cold blue tones',
    shortHookStyle: 'documentary tone, pause before shocking final clue',
    videoMood: 'mysterious, investigative, tense',
    colorTint: 'rgba(42, 42, 42, 0.15)',
    themeColor: '#00001a',
    particleEffect: 'smoke',
    leadIn: 'The final clue revealed...',
    themeLabel: 'MYSTERY',
    themeEmoji: '🔍',
    exampleOpenings: [
      'The detective had solved 200 cases. Case 201 was about his own disappearance.',
      'Every year on the same date, someone left flowers on the grave. The dead man had no family.',
      'The CCTV footage showed him walking into the building. It never showed him leaving.',
    ],
  },
  {
    id: 'motivational_underdog',
    name: 'Motivational Underdog',
    stylePrompt:
      'Chinese anime donghua art style, soft volumetric lighting, warm inner glow, traditional hanfu clothing, dark atmospheric background, delicate facial features, rich deep colors, dramatic shadows, high quality illustration, 8k, cinematic composition, golden sunrise, triumph, flowing robes',
    voiceTone: 'powerful and inspiring, building energy, emotional peaks',
    facebookHashtags:
      '#motivation #inspiration #success #nevergiveup #mindset #storytime #UntoldLores',
    youtubeTags:
      'motivational story, inspiration, success story, underdog, animated motivation, untold lores, never give up, true story',
    cliffhangerStyle: 'End each part at the lowest point or highest triumph',
    thumbnailMood: 'triumphant, golden light, determined face, rising sun, powerful pose',
    shortHookStyle: 'building crescendo, powerful voice, triumphant final line',
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
    ],
  },
  {
    id: 'dark_fantasy',
    name: 'Dark Fantasy Adventure',
    stylePrompt:
      'Chinese anime donghua art style, soft volumetric lighting, warm inner glow, traditional hanfu clothing, dark atmospheric background, delicate facial features, rich deep colors, dramatic shadows, high quality illustration, 8k, cinematic composition, magic particles, dragons, ancient temple, swords',
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
