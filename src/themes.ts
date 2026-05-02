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
  // Optional: overrides the default "generate a fictional story" instruction.
  // Use for themes that must be factual (e.g. real documented events).
  storyInstructions?: string;
  // Optional: overrides the hardcoded 'anime art style, cel shading, 2D illustration' prefix
  // used at the start of every image generation prompt.
  imageStylePrefix?: string;
}

export const THEMES: Theme[] = [
  {
    id: 'horror_thriller',
    name: 'Horror & Thriller',
    stylePrompt:
      'horror anime art style, dark terrifying atmosphere, blood splatter, deep shadows, eerie fog, ghostly apparitions, moonlit darkness, pale frightened faces, 2D illustration, cel shading, dramatic horror lighting, ominous background, 8k, highly detailed',
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
    imageStylePrefix: 'horror anime art style, cel shading, 2D illustration, dark terrifying atmosphere, blood splatter, pale terrified faces, grotesque monsters, pitch black shadows, visceral horror',
    exampleOpenings: [
      'He checked on the children at midnight. The beds were empty. But he could hear them laughing downstairs.',
      'He had been receiving voicemails from his dead father for three weeks.',
      'The new neighbor introduced himself. He recognized him immediately — from his nightmares.',
    ],
  },
  // {
  //   id: 'drama_betrayal',
  //   name: 'Drama & Betrayal',
  //   stylePrompt:
  //     'anime art style, soft volumetric lighting, warm inner glow, dark atmospheric background, expressive facial features, rich deep colors, dramatic shadows, high quality illustration, 8k, cinematic composition, tears, palace interior, candlelight',
  //   voiceTone: 'emotional and intense, dramatic pauses at shocking moments',
  //   facebookHashtags: '#drama #storytime #betrayal #relationship #shocking #mustread #UntoldLores',
  //   youtubeTags:
  //     'drama story, betrayal, relationship story, emotional story, animated drama, untold lores, story time, shocking story',
  //   cliffhangerStyle: 'End each part with a shocking betrayal reveal, emotional gut-punch, or the moment the betrayer gets publicly exposed and destroyed',
  //   thumbnailMood: 'tearful, shocked, dramatic close-up, warm amber tones',
  //   shortHookStyle: 'emotional build, voice breaking, devastating final reveal — or a satisfying face-slap moment where the audience cheers',
  //   videoMood: 'emotional, intense, dramatic',
  //   colorTint: 'rgba(255, 140, 0, 0.10)',
  //   themeColor: '#1a0800',
  //   particleEffect: 'petals',
  //   leadIn: "That's when everything fell apart...",
  //   themeLabel: 'DRAMA',
  //   themeEmoji: '💔',
  //   exampleOpenings: [
  //     'He found the messages on her phone. The hotel. The same night she told him she was working late.',
  //     'My best friend of 20 years just testified against me in court. This is what really happened.',
  //     'He proposed in Paris. What he did not know was that her other boyfriend was waiting at the airport.',
  //     'She humiliated me in front of 300 wedding guests. So I waited. And I made sure everyone found out the truth.',
  //     'My sister stole my identity, my savings, and my fiancé. Then she invited me to her wedding.',
  //     'They fired me on my birthday and laughed. Six months later I bought the company.',
  //   ],
  // },
  // {
  //   id: 'motivational_underdog',
  //   name: 'Motivational Underdog',
  //   stylePrompt:
  //     'anime art style, soft volumetric lighting, warm inner glow, dark atmospheric background, expressive facial features, rich deep colors, dramatic shadows, high quality illustration, 8k, cinematic composition, golden sunrise, triumph, dynamic action pose',
  //   voiceTone: 'powerful and inspiring, building energy, emotional peaks',
  //   facebookHashtags:
  //     '#motivation #inspiration #success #nevergiveup #mindset #storytime #UntoldLores',
  //   youtubeTags:
  //     'motivational story, inspiration, success story, underdog, animated motivation, untold lores, never give up, true story',
  //   cliffhangerStyle: 'End each part at the lowest point, the highest triumph, or the face-slap moment where everyone who doubted them watches them win in public',
  //   thumbnailMood: 'triumphant, golden light, determined face, rising sun, powerful pose',
  //   shortHookStyle: 'building crescendo, powerful voice, triumphant final line — or a face-slap reveal that makes the audience want to stand up and cheer',
  //   videoMood: 'inspiring, uplifting, emotional',
  //   colorTint: 'rgba(255, 215, 0, 0.10)',
  //   themeColor: '#1a1400',
  //   particleEffect: 'gold',
  //   leadIn: 'That was the moment he understood...',
  //   themeLabel: 'MOTIVATION',
  //   themeEmoji: '⚡',
  //   exampleOpenings: [
  //     'At 38, he lost his job, his house, and his family in the same month. Three years later he employs 200 people.',
  //     'He was told he would never walk again. He ran a marathon 18 months later.',
  //     'Everyone in his village laughed when he said he would go to university. He went to Oxford.',
  //     'My boss told me I was too stupid to ever lead a team. I became his boss two years later.',
  //     'They cut me from the team and gave my spot to the coach\'s nephew. I made it to the national team. He didn\'t.',
  //     'She laughed when I said I\'d pay back every cent. I handed her a check in front of the same people who watched her humiliate me.',
  //   ],
  // },
  {
    id: 'unexplained_events',
    name: 'Real Unexplained Events',
    stylePrompt:
      'anime art style, documentary realism, harsh fluorescent or flashlight lighting, grainy night-vision green tint on outdoor scenes, cold clinical whites for indoor scenes, dark atmospheric backgrounds, wide fearful eyes, muted realistic color palette, high quality illustration, 8k, cinematic composition, security camera angles, found-footage aesthetic, isolated wilderness, government buildings, small towns at night, surveillance footage grain',
    voiceTone: 'serious and measured, like a documentary narrator presenting verified facts, calm authority that makes the strangeness more disturbing — not sensational, just factual and deeply unsettling',
    facebookHashtags: '#paranormal #unexplained #supernatural #truestory #mystery #creepy #UntoldLores #realevents #scarystory',
    youtubeTags:
      'unexplained events, paranormal, real supernatural events, true mystery, unsolved mystery, real ghost story, untold lores, documentary, real paranormal, creepy true story',
    cliffhangerStyle:
      'End each part with a detail from the official record, a final witness statement, or a piece of physical evidence that has never been explained — something the authorities documented but could not account for. The facts themselves are the horror.',
    thumbnailMood: 'documentary still, grainy or overexposed, a location or object that looks wrong, cold clinical tones, security camera aesthetic',
    shortHookStyle: 'flat factual delivery of an impossible detail, no embellishment needed — the strangeness of the real event speaks for itself',
    videoMood: 'documentary, clinical dread, quiet disbelief',
    colorTint: 'rgba(0, 30, 20, 0.18)',
    themeColor: '#020f08',
    particleEffect: 'dust',
    leadIn: 'What happened next has never been explained...',
    themeLabel: 'TRUE EVENT',
    themeEmoji: '📹',
    storyInstructions: `This theme is NON-FICTION. Do NOT invent a story.
Instead, select ONE real documented unexplained or paranormal event that actually occurred in history.
The entire story must be factually accurate: use the real names of actual people, real dates, real locations, and real evidence exactly as recorded.
Base every detail on documented facts, official records, verified witness testimony, and physical evidence.
Do not fabricate dialogue, invent details, or add anything that was not documented.
Structure the 4 parts as: (1) the people and the situation before the event, (2) the event itself as witnesses reported it, (3) the official investigation and physical evidence found, (4) the aftermath, the unanswered questions, and why it remains unexplained today.
Draw from real cases such as: the Dyatlov Pass incident (1959), the Rendlesham Forest incident (1980), the Frederick Valentich disappearance (1978), the Enfield Poltergeist (1977), the Skinwalker Ranch events, the Hessdalen lights, the Pascagoula abduction (1973), the Ariel School UFO sighting (1994), the Flannan Isles lighthouse disappearance (1900), the Max Headroom broadcast intrusion (1987), the Taos Hum, the Oakville Blobs (1994), or any other well-documented case.
Choose a case with rich documentation so the 4-part structure can be filled with real verified detail.`,
    exampleOpenings: [
      'In February 1959, nine experienced Soviet hikers died on a mountain pass in the Ural range. They were found days later in conditions that investigators could not explain: their tent had been cut open from the inside, they had fled into minus-thirty-degree temperatures wearing almost nothing, and several had internal injuries consistent with a car crash despite no external wounds. One woman was missing her tongue. The Soviet government classified the case. The official cause of death was listed as "a compelling unknown force." The pass is now named after the group\'s leader. The case was reopened in 2019. It was closed again without conclusion.',
      'In 1966, two police officers in Portage County, Ohio, pursued a low-flying object for eighty-five miles across two state lines. Deputy Spaur reported that the object — circular, metallic, and silent — paced his cruiser, matched every turn, and held position directly above him when he stopped. Four officers across multiple counties witnessed it. It was tracked on radar. The Air Force investigation concluded the officers had seen a satellite, then a star, then a communication tower. Deputy Spaur gave interviews for months. Then he stopped. He lost his job, his marriage, and his home. He was found living in an abandoned building two years later. He told the reporter who found him: I know what I saw. I just want people to stop asking me about it.',
      'In 1980 something entered the Rendlesham Forest adjacent to two US Air Force bases in Suffolk, England. Over three nights, security personnel reported lights moving through the trees, a craft landing in a clearing, and triangular burn marks in the soil. The deputy base commander, Lieutenant Colonel Charles Halt, recorded the incident on audio tape as it happened. He can be heard saying: I see it too. It\'s back again. The tape still exists. The burn marks were measured and documented. Radiation readings at the site were taken and recorded. The UK Ministry of Defence investigated and officially concluded the event had no defence significance. Lieutenant Colonel Halt spent the next four decades asking publicly why no one would explain what he saw.',
      'In 1978, Frederick Valentich radioed Melbourne air traffic control to report an unidentified craft flying above his small Cessna over Bass Strait. The conversation lasted seventeen minutes and was recorded in full. He described the object hovering above him, a long metallic shape, not an aircraft. He said it was not an aircraft. His final transmission was seventeen seconds of metallic scraping sound. Then silence. Neither Frederick Valentich nor his aircraft was ever found. No wreckage. No body. No distress beacon activation. The Civil Aviation Authority investigated. The investigation was closed without a finding. The recording of his final transmission is available to the public.',
    ],
  },
  {
    id: 'ghost_stories',
    name: 'Ghost Stories',
    stylePrompt:
      'horror anime art style, pitch black darkness, decomposing pale ghost with hollow sunken black eye sockets and grey cracked skin, visible dark veins under translucent flesh, cracked walls with blood writing, flickering dying candle throwing wild shadows, deep impenetrable darkness devouring the corners of every room, protagonist frozen with pure terror, wide white eyes, grotesque supernatural figures emerging from shadow, cold moonlight slicing through broken windows, 8k, highly detailed, visceral horror composition',
    voiceTone: 'slow and deliberate, the voice of someone who survived something they cannot forget. Builds dread with every sentence. Drops to near-whisper at the most horrifying details. Never lets the audience feel safe. Pauses at the worst moments to let the horror sink in.',
    facebookHashtags: '#ghoststory #paranormal #scarystory #horror #terrifying #supernatural #UntoldLores #haunted #trueghoststory',
    youtubeTags:
      'ghost story, paranormal, supernatural, scary story, terrifying ghost story, horror narration, untold lores, haunted house, scariest ghost stories, true horror',
    cliffhangerStyle:
      'End each part at the moment of maximum terror — the protagonist comes face to face with the entity, something reaches for them in the dark, or they realize with absolute certainty that it is in the room with them right now. The cliffhanger must leave the audience genuinely afraid to keep reading.',
    thumbnailMood: 'pitch black background, pale ghost face with hollow black eyes staring directly at the viewer, single cold light across a face frozen in terror, visceral and deeply unsettling',
    shortHookStyle: 'calm voice that drops to a near-whisper, building dread, then a single devastating sentence delivered in complete silence — the horror of what was already there',
    videoMood: 'pitch black, suffocating dread, inescapable terror',
    colorTint: 'rgba(5, 0, 15, 0.28)',
    themeColor: '#050010',
    particleEffect: 'dust',
    leadIn: "I don't know how to explain what I saw...",
    themeLabel: 'GHOST STORY',
    themeEmoji: '💀',
    imageStylePrefix: 'horror anime art style, cel shading, 2D illustration, pale female ghost with blood streaming down her cracked decomposing face, hollow sunken black eye sockets, dark veins visible under translucent rotting skin, blood splatter on walls, pitch black suffocating darkness, victim frozen in absolute terror, wide white horror-struck eyes, grotesque supernatural entity emerging from shadow',
    storyInstructions: `Write a genuinely terrifying ghost story. This is not atmosphere — it is fear.

The ghost or entity MUST be physically described in visceral, specific detail: its face, its hands, the way it moves, the sounds it makes, what the air feels like when it is near. Not "a dark shape" — specific horrible detail.

The protagonist MUST come face to face with it. Not a glimpse. Not a feeling. A direct confrontation where they can see it clearly and cannot escape.

Include at least one scene where the protagonist is alone in complete darkness with the entity very close, and they cannot run.

Each part must escalate the dread. By Part 2 the reader should be uncomfortable. By Part 3 they should be afraid. By Part 4 they should be genuinely disturbed.

The horror must be INESCAPABLE — not "I moved and it was fine" but something that follows, that waits, that wants something specific from this person.

Write the physical experience of terror: the protagonist's body shaking, the cold that spreads from the corner, the sound that should not exist, the moment the entity's head turns slowly toward them in the dark.

End each part at the worst possible moment — the moment of maximum horror, not a quiet reframe. The audience must not be able to stop reading.`,
    exampleOpenings: [
      'My mother told me never to open the basement door. One night I heard something down there — soft, whimpering, almost like a puppy. I was six years old and I wanted to see it so badly. I crept down a few steps in the dark. There was no puppy. My mother yanked me back so hard I fell, and she held me against her chest and would not stop shaking. She never yelled. Not once in my life had she ever raised her voice at me. She yelled that night. Later she gave me a warm cookie and stroked my hair until I stopped crying, and she told me very quietly never to go down there again. I did not ask her why the boy in the corner had been moving like that, or why he had no hands or feet, or why he had looked up at me and smiled.',
      'When my sister and I were children, our family rented an old farmhouse for two summers. We loved everything about it — the creaking floors, the apple tree, the way fog sat in the fields at dawn. But our favorite thing was the ghost. We called her Mother, because she felt like one. Some mornings we would wake to find a cup of warm milk on each of our nightstands that had not been there when we fell asleep. Mother worried we would get thirsty in the night. In the living room there was an antique chair kept against the back wall. Whenever we sat watching television or playing cards, the chair would inch slowly forward across the room toward us, moving when we were not looking directly at it. Sometimes we would turn around and find it had crossed the whole room. We always felt a little guilty pushing it back. Mother only wanted to be near us. Years later I found a newspaper archive about the farmhouse. The original owner was a widow who had lived alone after her children died. She had given them each a cup of poisoned milk in the night, then hanged herself from a beam in the living room. The photograph that ran in the paper showed the living room. Her body. And below her feet, placed exactly in the center of the room, was the chair.',
      'I work the overnight shift at a care home for the elderly. One of our residents, a woman in her late eighties named Edna, began talking several months ago about a man who visited her room each night. She described him in detail — tall, wearing a dark coat, very quiet, very polite. She said he would sit in the chair beside her bed and keep her company. She was not frightened. She looked forward to it. We assumed she was dreaming, or perhaps experiencing mild confusion, which is common. We checked on her every hour. The chair was always empty. Then one night Edna passed away in her sleep, very peacefully, which was a blessing. When the morning staff went in to prepare the room, they found the chair had been moved from the corner to beside her bed. Nobody on the night shift had moved it. I had checked on her at two in the morning and it was still in the corner. By the time she was found at six, it was beside her, turned slightly toward her, the way you would turn a chair to face someone you were sitting with.',
      'My grandfather built the house himself in 1961 and lived in it until he died. After the funeral we went through his things. In the attic we found a small locked tin box. Inside was a single photograph — old, black and white, slightly water-damaged. It showed the front of a house we did not recognize, taken at night. A woman in a white dress stood in an upstairs window looking out. On the back of the photograph, in my grandfather\'s handwriting, was a single line: she has been watching since 1974. My grandfather moved into the house in 1961. He never told anyone about the photograph. We do not know the woman. We do not know the house. We have not been able to find it. What I have not told you yet is that I recognized the window. I recognized the curtains. It was the same upstairs window that looks into the room where my grandfather slept for fifty years.',
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
