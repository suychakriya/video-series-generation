# Story Generation Prompt

Copy the prompt for the theme you want and paste it directly into Claude.
Claude will respond with valid JSON — save that response as a `.json` file.

Themes rotate in order: **Horror & Thriller → Real Unexplained Events → Ghost Stories → Dark Fantasy**

---

## How to use

1. Pick the theme you want below
2. (Optional) Swap the seed lines for variety — all options are listed under each theme
3. Copy the entire prompt block and paste into Claude
4. Save Claude's JSON response as `story_YYYYMMDD_001.json`

---

## Theme 1 — Horror & Thriller

> Swap any of the three STORY VARIATION DIRECTIVE lines with another option from the seed lists below the prompt.

```
IMPORTANT: Do NOT build any app, tool, artifact, or interface. Do NOT write any code. Simply read these instructions and respond with the raw JSON story output directly in your reply. Nothing else.

You are a master storyteller for "Untold Lores", a viral social media channel.

Generate a complete original fictional 4-part story for the theme: "Horror & Thriller"

STORY VARIATION DIRECTIVE — you MUST build this story around ALL THREE of these specifics:
- Setting: remote mountain research station cut off by early snowfall, no signal, one exit
- Protagonist: private investigator in his 50s, hired by a family who believe their loved one was murdered and staged as an accident
- Core premise: a message meant for someone else lands with the protagonist and contains information that puts his life at risk

Do not substitute or ignore any of these. The setting, protagonist background, and core premise must be the foundation of the story from the very first sentence.

Theme: "Horror & Thriller"

Style: horror anime art style, dark terrifying atmosphere, blood splatter, deep shadows, eerie fog, ghostly apparitions, moonlit darkness, pale frightened faces, 2D illustration, cel shading, dramatic horror lighting, ominous background, 8k, highly detailed
Voice tone: slow and suspenseful, whispering tone, dramatic pauses
Cliffhanger style: End each part with a terrifying revelation that makes it impossible not to watch the next part

Example openings for inspiration (don't copy directly):
1. He checked on the children at midnight. The beds were empty. But he could hear them laughing downstairs.
2. He had been receiving voicemails from his dead father for three weeks.
3. The new neighbor introduced himself. He recognized him immediately — from his nightmares.

SUSPENSE & PLOT TWIST REQUIREMENTS (apply to every theme):
- The story must be built on suspense. Every part must make the viewer desperate to know what happens next.
  Plant questions early that don't get answered until later — who is this person really? what is being hidden? what does this mean?
- Each part must contain at least one genuine plot twist or revelation that recontextualizes something the viewer thought they understood.
  The best twists feel inevitable in hindsight — the clues were always there.
- Use the "false floor" technique: give the viewer one explanation, let them settle into it, then pull it away.
- Suspense builds from information gaps. Decide carefully what the viewer knows vs. what the character knows vs. what is hidden from both.
- The overall 4-part arc must have a major twist or revelation in Part 3 or Part 4 that reframes the entire story.

REQUIREMENTS:
- The main protagonist MUST be male. All stories are narrated by a male voice,
  so the lead character should be a man or boy. Supporting characters can be any gender.
- Character names and backgrounds must be VARIED across stories — do NOT default to Chinese names.
  Draw from diverse cultures: Japanese, Korean, Southeast Asian, Middle Eastern, European, African,
  Latin American, etc. Match the name to the story's setting and atmosphere, not the visual style.
  The visual style (anime art) is for images only — it does not dictate the story's culture.
- Each part: 800-1000 words
- Each part has as many scenes as the story naturally requires (min 5, max 40).
  Each scene covers 1-3 sentences of the story. Break the story into scenes at every
  meaningful narrative shift — a new location, a new revelation, a new emotional beat.
  More scenes = better image-to-voice sync, so err toward more scenes.
- CRITICAL: Every sentence of the content MUST appear in exactly one scene's narration.
  The narration fields across all scenes, concatenated in order, must equal the full content
  word-for-word. No sentence may be skipped or duplicated.
- Each scene's description MUST capture the single most dramatic, visually striking moment
  of that scene — the peak action, emotional climax, or pivotal reveal. Be cinematic and specific:
  WHO is doing WHAT, their exact expression/posture/action, and what surrounds them.
- For each scene, set show_character: true if the character's face/body is the main visual focus.
  Set show_character: false when the scene is better shown as: an environment (empty room, forest,
  city street), an object (a letter, a weapon, a door), a crowd shot, a wide establishing shot,
  or any moment where the atmosphere/setting matters more than the character's appearance.
  About 10-20% of scenes should have show_character: false for visual variety.
- For each scene, set show_entity: true if the ghost, monster, or supernatural entity is visually
  present and should appear in the image. Set show_entity: false for scenes where the entity is
  not visible (protagonist alone, environment only, objects, flashbacks without the entity).
  Only applies when entity_description is not null.
- CRITICAL — descriptions are sent DIRECTLY to an image generator that takes every word LITERALLY:
  - NO metaphors, similes, or figurative language. If the narration says "she moved like a wave",
    the description must NOT say "wave" — say what the character is literally doing instead.
  - NO abstract concepts ("grief", "hope", "fear") — describe the visible physical action only.
  - ONLY describe what would literally appear in a photograph or painting.
  Bad: "she dances like the waves of the sea" → image generator draws ocean waves.
  Bad: "his anger burned like fire" → image generator draws fire.
  Good: "she spins gracefully across the stone floor, arms outstretched, silk robes billowing".
  Good: "he clenches his jaw, fists shaking at his sides, eyes locked on the figure ahead".
- Each scene has vivid visual keywords focused on the key action, emotion, and atmosphere
  (not just the setting — include the character's state and the dramatic tension)
- Cliffhanger hook at end of each part (1-2 sentences, ultra dramatic)
- thumbnail_title: 3-5 words MAX, clickbait, NO punctuation
  Examples: "She Knew Too Much", "He Was Already Dead", "Nobody Believed Her"
- Facebook caption: 150-200 words, emotional, ends with question + hashtags
- YouTube title: SEO optimized, 60 chars max, includes part number
- YouTube description hook: first 2-3 sentences for the description

Respond with ONLY valid JSON in this exact format:
{
  "overall_title": "string",
  "character_description": "string (highly specific physical description for image consistency — MUST include: unique face feature like scar/unusual eyes/jaw shape, exact hair style and color, specific clothing with color, approximate age, skin tone, build. Example: 'young man mid-20s, lean build, olive skin, sharp angular jaw, short messy dark brown hair with a streak of grey, deep-set amber eyes, wearing a worn dark teal jacket over a grey tunic, small scar above left eyebrow')",
  "entity_description": "string or null (ONLY for stories with a ghost, monster, or recurring supernatural entity — describe its exact appearance in the same specific detail as character_description: skin color/texture, eye appearance, clothing or lack thereof, distinguishing features, how it moves. Example: 'tall female ghost, translucent pale grey rotting skin, black hollow eye sockets with thin red veins at the edges, cracked lips pulled back revealing grey teeth, long black matted hair partially covering her face, wearing a torn white burial dress stained dark at the hem, moves with a slow jerking motion as if her spine is broken'. Set to null if there is no recurring entity.)",
  "style_prompt": "string (specific visual style for this story)",
  "image_seed": number (random integer 1000-9999),
  "parts": [
    {
      "part": 1,
      "title": "string",
      "content": "string (800-1000 words)",
      "hook": "string (cliffhanger ending, 1-2 sentences)",
      "thumbnail_title": "string (3-5 words, no punctuation)",
      "scenes": [
        {
          "scene_number": 1,
          "narration": "string (the exact sentences from content spoken during this scene)",
          "description": "string (cinematic peak moment for image generation — literal visuals only, no metaphors)",
          "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
          "show_character": true,
          "show_entity": false
        }
      ],
      "facebook_caption": "string",
      "youtube_title": "string",
      "youtube_description_hook": "string"
    }
  ]
}
```

### Horror & Thriller — Seed Options (swap any line above)

**Settings:**
- remote mountain research station cut off by early snowfall, no signal, one exit
- suburban neighborhood where three families have disappeared without explanation over five years
- overnight express train crossing a desert — no stops for fourteen hours, nowhere to go
- isolated island resort that the ferry inexplicably stopped servicing two months ago
- abandoned chemical plant being demolished by a skeleton crew working nights only
- private psychiatric clinic that only accepts referrals from a specific list of doctors
- small coastal town where the fishing fleet returned to harbor with no crew aboard
- luxury high-rise apartment building where none of the residents ever seem to leave
- closed border crossing checkpoint that has been sealed to the public for six months
- long-haul trucking route through empty rural backroads, three days with no other traffic

**Protagonists:**
- private investigator in his 50s, hired by a family who believe their loved one was murdered and staged as an accident
- forensic accountant who discovers numbers in a client's books that should not be possible
- ex-military contractor working private security for a corporation he knows almost nothing about
- insomniac emergency room doctor who starts noticing the same pattern of injuries across patients with no connection to each other
- journalist who receives an anonymous tip pointing to a person who was officially declared dead twice
- data recovery specialist hired to wipe a hard drive who reads what is on it first
- criminal defense lawyer assigned a client who appears to need no defending and will not explain why
- newly hired hotel manager who finds his predecessor's hidden records locked in a basement office
- air traffic controller who receives a radio transmission from a flight number that landed three years ago
- government archivist assigned to destroy a batch of old classified documents who reads them before shredding

**Premises:**
- a message meant for someone else lands with the protagonist and contains information that puts his life at risk
- someone the protagonist has trusted completely for years is exposed as something entirely different from who he believed
- a cold case produces new physical evidence that points directly at someone alive, nearby, and watching
- several unconnected people are being methodically erased from all records — digital, physical, photographic — one by one
- the same fatal accident has happened to the same family in the same location across three generations
- the protagonist discovers he has been under continuous surveillance for years and has no idea why
- an inheritance arrives with conditions attached that reveal the family has been concealing something catastrophic
- two strangers discover their entire lives were shaped by decisions made by the same unknown person
- the protagonist is the only person who remembers a specific event that everyone else insists never happened
- a list of names is shrinking — one every few weeks — and the protagonist's name is on it

---

## Theme 2 — Real Unexplained Events

> No seeds for this theme — the real case provides uniqueness. Each run should pick a different documented event.

```
IMPORTANT: Do NOT build any app, tool, artifact, or interface. Do NOT write any code. Simply read these instructions and respond with the raw JSON story output directly in your reply. Nothing else.

You are a master storyteller for "Untold Lores", a viral social media channel.

This theme is NON-FICTION. Do NOT invent a story.
Instead, select ONE real documented unexplained or paranormal event that actually occurred in history.
The entire story must be factually accurate: use the real names of actual people, real dates, real locations, and real evidence exactly as recorded.
Base every detail on documented facts, official records, verified witness testimony, and physical evidence.
Do not fabricate dialogue, invent details, or add anything that was not documented.
Structure the 4 parts as: (1) the people and the situation before the event, (2) the event itself as witnesses reported it, (3) the official investigation and physical evidence found, (4) the aftermath, the unanswered questions, and why it remains unexplained today.
Draw from real cases such as: the Dyatlov Pass incident (1959), the Rendlesham Forest incident (1980), the Frederick Valentich disappearance (1978), the Enfield Poltergeist (1977), the Skinwalker Ranch events, the Hessdalen lights, the Pascagoula abduction (1973), the Ariel School UFO sighting (1994), the Flannan Isles lighthouse disappearance (1900), the Max Headroom broadcast intrusion (1987), the Taos Hum, the Oakville Blobs (1994), or any other well-documented case.
Choose a case with rich documentation so the 4-part structure can be filled with real verified detail.

Theme: "Real Unexplained Events"

Style: anime art style, documentary realism, harsh fluorescent or flashlight lighting, grainy night-vision green tint on outdoor scenes, cold clinical whites for indoor scenes, dark atmospheric backgrounds, wide fearful eyes, muted realistic color palette, high quality illustration, 8k, cinematic composition, security camera angles, found-footage aesthetic, isolated wilderness, government buildings, small towns at night, surveillance footage grain
Voice tone: serious and measured, like a documentary narrator presenting verified facts, calm authority that makes the strangeness more disturbing — not sensational, just factual and deeply unsettling
Cliffhanger style: End each part with a detail from the official record, a final witness statement, or a piece of physical evidence that has never been explained — something the authorities documented but could not account for. The facts themselves are the horror.

Example openings for inspiration (don't copy directly):
1. In February 1959, nine experienced Soviet hikers died on a mountain pass in the Ural range. They were found days later in conditions that investigators could not explain...
2. In 1966, two police officers in Portage County, Ohio, pursued a low-flying object for eighty-five miles across two state lines...
3. In 1980 something entered the Rendlesham Forest adjacent to two US Air Force bases in Suffolk, England...

SUSPENSE & PLOT TWIST REQUIREMENTS (apply to every theme):
- The story must be built on suspense. Every part must make the viewer desperate to know what happens next.
  Plant questions early that don't get answered until later — who is this person really? what is being hidden? what does this mean?
- Each part must contain at least one genuine plot twist or revelation that recontextualizes something the viewer thought they understood.
  The best twists feel inevitable in hindsight — the clues were always there.
- Use the "false floor" technique: give the viewer one explanation, let them settle into it, then pull it away.
- Suspense builds from information gaps. Decide carefully what the viewer knows vs. what the character knows vs. what is hidden from both.
- The overall 4-part arc must have a major twist or revelation in Part 3 or Part 4 that reframes the entire story.

REQUIREMENTS:
- The main protagonist MUST be male. All stories are narrated by a male voice,
  so the lead character should be a man or boy. Supporting characters can be any gender.
- Character names and backgrounds must be VARIED across stories — do NOT default to Chinese names.
  Draw from diverse cultures: Japanese, Korean, Southeast Asian, Middle Eastern, European, African,
  Latin American, etc. Match the name to the story's setting and atmosphere, not the visual style.
  The visual style (anime art) is for images only — it does not dictate the story's culture.
- Each part: 800-1000 words
- Each part has as many scenes as the story naturally requires (min 5, max 40).
  Each scene covers 1-3 sentences of the story. Break the story into scenes at every
  meaningful narrative shift — a new location, a new revelation, a new emotional beat.
  More scenes = better image-to-voice sync, so err toward more scenes.
- CRITICAL: Every sentence of the content MUST appear in exactly one scene's narration.
  The narration fields across all scenes, concatenated in order, must equal the full content
  word-for-word. No sentence may be skipped or duplicated.
- Each scene's description MUST capture the single most dramatic, visually striking moment
  of that scene — the peak action, emotional climax, or pivotal reveal. Be cinematic and specific:
  WHO is doing WHAT, their exact expression/posture/action, and what surrounds them.
- For each scene, set show_character: true if the character's face/body is the main visual focus.
  Set show_character: false when the scene is better shown as: an environment (empty room, forest,
  city street), an object (a letter, a weapon, a door), a crowd shot, a wide establishing shot,
  or any moment where the atmosphere/setting matters more than the character's appearance.
  About 10-20% of scenes should have show_character: false for visual variety.
- For each scene, set show_entity: true if the ghost, monster, or supernatural entity is visually
  present and should appear in the image. Set show_entity: false for scenes where the entity is
  not visible (protagonist alone, environment only, objects, flashbacks without the entity).
  Only applies when entity_description is not null.
- CRITICAL — descriptions are sent DIRECTLY to an image generator that takes every word LITERALLY:
  - NO metaphors, similes, or figurative language. If the narration says "she moved like a wave",
    the description must NOT say "wave" — say what the character is literally doing instead.
  - NO abstract concepts ("grief", "hope", "fear") — describe the visible physical action only.
  - ONLY describe what would literally appear in a photograph or painting.
  Bad: "she dances like the waves of the sea" → image generator draws ocean waves.
  Bad: "his anger burned like fire" → image generator draws fire.
  Good: "she spins gracefully across the stone floor, arms outstretched, silk robes billowing".
  Good: "he clenches his jaw, fists shaking at his sides, eyes locked on the figure ahead".
- Each scene has vivid visual keywords focused on the key action, emotion, and atmosphere
  (not just the setting — include the character's state and the dramatic tension)
- Cliffhanger hook at end of each part (1-2 sentences, ultra dramatic)
- thumbnail_title: 3-5 words MAX, clickbait, NO punctuation
  Examples: "She Knew Too Much", "He Was Already Dead", "Nobody Believed Her"
- Facebook caption: 150-200 words, emotional, ends with question + hashtags
- YouTube title: SEO optimized, 60 chars max, includes part number
- YouTube description hook: first 2-3 sentences for the description

Respond with ONLY valid JSON in this exact format:
{
  "overall_title": "string",
  "character_description": "string (highly specific physical description for image consistency — MUST include: unique face feature like scar/unusual eyes/jaw shape, exact hair style and color, specific clothing with color, approximate age, skin tone, build. Example: 'young man mid-20s, lean build, olive skin, sharp angular jaw, short messy dark brown hair with a streak of grey, deep-set amber eyes, wearing a worn dark teal jacket over a grey tunic, small scar above left eyebrow')",
  "entity_description": "string or null (ONLY for stories with a ghost, monster, or recurring supernatural entity — describe its exact appearance in the same specific detail as character_description: skin color/texture, eye appearance, clothing or lack thereof, distinguishing features, how it moves. Example: 'tall female ghost, translucent pale grey rotting skin, black hollow eye sockets with thin red veins at the edges, cracked lips pulled back revealing grey teeth, long black matted hair partially covering her face, wearing a torn white burial dress stained dark at the hem, moves with a slow jerking motion as if her spine is broken'. Set to null if there is no recurring entity.)",
  "style_prompt": "string (specific visual style for this story)",
  "image_seed": number (random integer 1000-9999),
  "parts": [
    {
      "part": 1,
      "title": "string",
      "content": "string (800-1000 words)",
      "hook": "string (cliffhanger ending, 1-2 sentences)",
      "thumbnail_title": "string (3-5 words, no punctuation)",
      "scenes": [
        {
          "scene_number": 1,
          "narration": "string (the exact sentences from content spoken during this scene)",
          "description": "string (cinematic peak moment for image generation — literal visuals only, no metaphors)",
          "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
          "show_character": true,
          "show_entity": false
        }
      ],
      "facebook_caption": "string",
      "youtube_title": "string",
      "youtube_description_hook": "string"
    }
  ]
}
```

---

## Theme 3 — Ghost Stories

> Swap any of the three STORY VARIATION DIRECTIVE lines with another option from the seed lists below the prompt.

```
IMPORTANT: Do NOT build any app, tool, artifact, or interface. Do NOT write any code. Simply read these instructions and respond with the raw JSON story output directly in your reply. Nothing else.

You are a master storyteller for "Untold Lores", a viral social media channel.

Write a genuinely terrifying ghost story. This is not atmosphere — it is fear.

The ghost or entity MUST be physically described in visceral, specific detail: its face, its hands, the way it moves, the sounds it makes, what the air feels like when it is near. Not "a dark shape" — specific horrible detail.

The protagonist MUST come face to face with it. Not a glimpse. Not a feeling. A direct confrontation where they can see it clearly and cannot escape.

Include at least one scene where the protagonist is alone in complete darkness with the entity very close, and they cannot run.

Each part must escalate the dread. By Part 2 the reader should be uncomfortable. By Part 3 they should be afraid. By Part 4 they should be genuinely disturbed.

The horror must be INESCAPABLE — not "I moved and it was fine" but something that follows, that waits, that wants something specific from this person.

Write the physical experience of terror: the protagonist's body shaking, the cold that spreads from the corner, the sound that should not exist, the moment the entity's head turns slowly toward them in the dark.

End each part at the worst possible moment — the moment of maximum horror, not a quiet reframe. The audience must not be able to stop reading.

STORY VARIATION DIRECTIVE — you MUST build this story around ALL THREE of these specifics:
- Setting: 1970s apartment block in Hong Kong — narrow corridors, paper-thin walls, twelfth floor, lift that stops on its own
- Protagonist: night shift security guard, early 40s, recently divorced, not sleeping well, assigned to an empty building alone
- Core premise: something that was physically sealed inside a room forty years ago has gotten out and is still in the building

Do not substitute or ignore any of these. The setting, protagonist background, and core premise must be the foundation of the story from the very first sentence.

Theme: "Ghost Stories"

Style: horror anime art style, pitch black darkness, decomposing pale ghost with hollow sunken black eye sockets and grey cracked skin, visible dark veins under translucent flesh, cracked walls with blood writing, flickering dying candle throwing wild shadows, deep impenetrable darkness devouring the corners of every room, protagonist frozen with pure terror, wide white eyes, grotesque supernatural figures emerging from shadow, cold moonlight slicing through broken windows, 8k, highly detailed, visceral horror composition
Voice tone: slow and deliberate, the voice of someone who survived something they cannot forget. Builds dread with every sentence. Drops to near-whisper at the most horrifying details. Never lets the audience feel safe. Pauses at the worst moments to let the horror sink in.
Cliffhanger style: End each part at the moment of maximum terror — the protagonist comes face to face with the entity, something reaches for them in the dark, or they realize with absolute certainty that it is in the room with them right now. The cliffhanger must leave the audience genuinely afraid to keep reading.

Example openings for inspiration (don't copy directly):
1. My mother told me never to open the basement door. One night I heard something down there — soft, whimpering, almost like a puppy. I was six years old and I wanted to see it so badly...
2. When my sister and I were children, our family rented an old farmhouse for two summers. We loved everything about it — the creaking floors, the apple tree, the way fog sat in the fields at dawn. But our favorite thing was the ghost...
3. I work the overnight shift at a care home for the elderly. One of our residents, a woman in her late eighties named Edna, began talking several months ago about a man who visited her room each night...

SUSPENSE & PLOT TWIST REQUIREMENTS (apply to every theme):
- The story must be built on suspense. Every part must make the viewer desperate to know what happens next.
  Plant questions early that don't get answered until later — who is this person really? what is being hidden? what does this mean?
- Each part must contain at least one genuine plot twist or revelation that recontextualizes something the viewer thought they understood.
  The best twists feel inevitable in hindsight — the clues were always there.
- Use the "false floor" technique: give the viewer one explanation, let them settle into it, then pull it away.
- Suspense builds from information gaps. Decide carefully what the viewer knows vs. what the character knows vs. what is hidden from both.
- The overall 4-part arc must have a major twist or revelation in Part 3 or Part 4 that reframes the entire story.

REQUIREMENTS:
- The main protagonist MUST be male. All stories are narrated by a male voice,
  so the lead character should be a man or boy. Supporting characters can be any gender.
- Character names and backgrounds must be VARIED across stories — do NOT default to Chinese names.
  Draw from diverse cultures: Japanese, Korean, Southeast Asian, Middle Eastern, European, African,
  Latin American, etc. Match the name to the story's setting and atmosphere, not the visual style.
  The visual style (anime art) is for images only — it does not dictate the story's culture.
- Each part: 800-1000 words
- Each part has as many scenes as the story naturally requires (min 5, max 40).
  Each scene covers 1-3 sentences of the story. Break the story into scenes at every
  meaningful narrative shift — a new location, a new revelation, a new emotional beat.
  More scenes = better image-to-voice sync, so err toward more scenes.
- CRITICAL: Every sentence of the content MUST appear in exactly one scene's narration.
  The narration fields across all scenes, concatenated in order, must equal the full content
  word-for-word. No sentence may be skipped or duplicated.
- Each scene's description MUST capture the single most dramatic, visually striking moment
  of that scene — the peak action, emotional climax, or pivotal reveal. Be cinematic and specific:
  WHO is doing WHAT, their exact expression/posture/action, and what surrounds them.
- For each scene, set show_character: true if the character's face/body is the main visual focus.
  Set show_character: false when the scene is better shown as: an environment (empty room, forest,
  city street), an object (a letter, a weapon, a door), a crowd shot, a wide establishing shot,
  or any moment where the atmosphere/setting matters more than the character's appearance.
  About 10-20% of scenes should have show_character: false for visual variety.
- For each scene, set show_entity: true if the ghost, monster, or supernatural entity is visually
  present and should appear in the image. Set show_entity: false for scenes where the entity is
  not visible (protagonist alone, environment only, objects, flashbacks without the entity).
  Only applies when entity_description is not null.
- CRITICAL — descriptions are sent DIRECTLY to an image generator that takes every word LITERALLY:
  - NO metaphors, similes, or figurative language. If the narration says "she moved like a wave",
    the description must NOT say "wave" — say what the character is literally doing instead.
  - NO abstract concepts ("grief", "hope", "fear") — describe the visible physical action only.
  - ONLY describe what would literally appear in a photograph or painting.
  Bad: "she dances like the waves of the sea" → image generator draws ocean waves.
  Bad: "his anger burned like fire" → image generator draws fire.
  Good: "she spins gracefully across the stone floor, arms outstretched, silk robes billowing".
  Good: "he clenches his jaw, fists shaking at his sides, eyes locked on the figure ahead".
- Each scene has vivid visual keywords focused on the key action, emotion, and atmosphere
  (not just the setting — include the character's state and the dramatic tension)
- Cliffhanger hook at end of each part (1-2 sentences, ultra dramatic)
- thumbnail_title: 3-5 words MAX, clickbait, NO punctuation
  Examples: "She Knew Too Much", "He Was Already Dead", "Nobody Believed Her"
- Facebook caption: 150-200 words, emotional, ends with question + hashtags
- YouTube title: SEO optimized, 60 chars max, includes part number
- YouTube description hook: first 2-3 sentences for the description

Respond with ONLY valid JSON in this exact format:
{
  "overall_title": "string",
  "character_description": "string (highly specific physical description for image consistency — MUST include: unique face feature like scar/unusual eyes/jaw shape, exact hair style and color, specific clothing with color, approximate age, skin tone, build. Example: 'young man mid-20s, lean build, olive skin, sharp angular jaw, short messy dark brown hair with a streak of grey, deep-set amber eyes, wearing a worn dark teal jacket over a grey tunic, small scar above left eyebrow')",
  "entity_description": "string or null (ONLY for stories with a ghost, monster, or recurring supernatural entity — describe its exact appearance in the same specific detail as character_description: skin color/texture, eye appearance, clothing or lack thereof, distinguishing features, how it moves. Example: 'tall female ghost, translucent pale grey rotting skin, black hollow eye sockets with thin red veins at the edges, cracked lips pulled back revealing grey teeth, long black matted hair partially covering her face, wearing a torn white burial dress stained dark at the hem, moves with a slow jerking motion as if her spine is broken'. Set to null if there is no recurring entity.)",
  "style_prompt": "string (specific visual style for this story)",
  "image_seed": number (random integer 1000-9999),
  "parts": [
    {
      "part": 1,
      "title": "string",
      "content": "string (800-1000 words)",
      "hook": "string (cliffhanger ending, 1-2 sentences)",
      "thumbnail_title": "string (3-5 words, no punctuation)",
      "scenes": [
        {
          "scene_number": 1,
          "narration": "string (the exact sentences from content spoken during this scene)",
          "description": "string (cinematic peak moment for image generation — literal visuals only, no metaphors)",
          "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
          "show_character": true,
          "show_entity": false
        }
      ],
      "facebook_caption": "string",
      "youtube_title": "string",
      "youtube_description_hook": "string"
    }
  ]
}
```

### Ghost Stories — Seed Options (swap any line above)

**Settings:**
- 1970s apartment block in Hong Kong — narrow corridors, paper-thin walls, twelfth floor, lift that stops on its own
- abandoned tuberculosis sanatorium in the rural Philippines, overgrown with jungle, last used in 1968
- old colonial plantation house in Malaysia built in the 1890s on land that was a mass grave
- remote mountain resort in Japan accessible only by a single mountain road that floods in heavy rain
- fishing village on the northern coast of Thailand where half the population left overnight in 1983 and never came back
- decommissioned Soviet-era sanatorium in the Caucasus mountains, never officially closed, now used as cheap dormitory housing
- converted shophouse in Penang — three floors, six tenants, one back room that has been locked since the building was purchased
- isolated lighthouse on a small island off the Irish coast, automated in 1978, accessed by supply boat twice a year
- public housing estate in Singapore — Block 13, Floor 13, Unit 13 — empty for four years despite a housing shortage
- traditional Korean hanok in the old quarter of Seoul, surrounded by modern construction, the last building left standing on the block
- decommissioned rural orphanage in Cambodia, closed under circumstances that were never officially explained
- underground bunker built beneath a Vietnamese village, sealed after the war, recently reopened during road construction

**Protagonists:**
- night shift security guard, early 40s, recently divorced, not sleeping well, assigned to an empty building alone
- documentary filmmaker making a low-budget piece on urban legends who starts to believe what he is filming
- young male teacher newly assigned to a school in a remote village, staying in the building's staff quarters
- building contractor hired to renovate the property who finds things inside the walls that should not be there
- nurse doing overnight rotations at a severely understaffed rural care home with long-term residents
- journalist investigating a cold case disappearance from the 1980s involving this specific location
- university student house-sitting for his parents who are abroad, alone in the family home for the first time
- elderly man returning to the house where he grew up to settle his recently deceased mother's estate
- social worker sent to make a welfare check on an isolated elderly resident who stopped returning calls
- caretaker hired by a property agency to watch an empty estate while it awaits sale after the last owner died intestate
- local police officer called to investigate noise complaints at a building that has been vacant for three years
- young archivist hired to catalogue old records discovered bricked up in a building's basement during renovations

**Premises:**
- something that was physically sealed inside a room forty years ago has gotten out and is still in the building
- a person who died violently in this building keeps appearing in the background of photographs taken here
- the protagonist keeps waking up in a part of the building he has no memory of going to
- a child begins describing in exact detail someone's death that occurred in this place before the child was born
- an audio recording made in this building contains sounds that were not audible at the time of recording
- every single person who has lived in this specific room has died in the same room, in the same position
- the previous occupant left behind a series of increasingly desperate warnings that no one took seriously
- something in the building responds when spoken to directly, and it is learning how to speak back
- the protagonist is being methodically led toward a specific place in the building — one room closer each night
- a face that belongs to no living person keeps appearing at the same window at the same time
- the building's layout is changing — rooms that existed two days ago are gone, new ones have appeared
- whatever haunts this place has followed the same family across generations and has just found the next one

---

## Theme 4 — Dark Fantasy Adventure

> Swap any of the three STORY VARIATION DIRECTIVE lines with another option from the seed lists below the prompt.

```
IMPORTANT: Do NOT build any app, tool, artifact, or interface. Do NOT write any code. Simply read these instructions and respond with the raw JSON story output directly in your reply. Nothing else.

You are a master storyteller for "Untold Lores", a viral social media channel.

Generate a complete original fictional 4-part story for the theme: "Dark Fantasy Adventure"

STORY VARIATION DIRECTIVE — you MUST build this story around ALL THREE of these specifics:
- Setting: ancient empire in its final decade — magic is visibly dying and no one can explain why
- Protagonist: disgraced general stripped of rank and given one final impossible mission as a chance at redemption
- Core premise: the prophecy the entire kingdom has built its identity around turns out to describe the villain, not the hero

Do not substitute or ignore any of these. The setting, protagonist background, and core premise must be the foundation of the story from the very first sentence.

Theme: "Dark Fantasy Adventure"

Style: anime art style, soft volumetric lighting, warm inner glow, dark atmospheric background, expressive facial features, rich deep colors, dramatic shadows, high quality illustration, 8k, cinematic composition, magic particles, dragons, ancient temple, swords
Voice tone: epic and theatrical, grand storytelling tone
Cliffhanger style: End each part with a shocking power reveal or world-changing event

Example openings for inspiration (don't copy directly):
1. The kingdom had been at peace for 100 years. The peace ended the night he was born.
2. He was the last dragon hunter. Until the day he discovered he was half dragon.
3. Magic had been forbidden for a century. He had been using it his whole life without knowing.

SUSPENSE & PLOT TWIST REQUIREMENTS (apply to every theme):
- The story must be built on suspense. Every part must make the viewer desperate to know what happens next.
  Plant questions early that don't get answered until later — who is this person really? what is being hidden? what does this mean?
- Each part must contain at least one genuine plot twist or revelation that recontextualizes something the viewer thought they understood.
  The best twists feel inevitable in hindsight — the clues were always there.
- Use the "false floor" technique: give the viewer one explanation, let them settle into it, then pull it away.
- Suspense builds from information gaps. Decide carefully what the viewer knows vs. what the character knows vs. what is hidden from both.
- The overall 4-part arc must have a major twist or revelation in Part 3 or Part 4 that reframes the entire story.

REQUIREMENTS:
- The main protagonist MUST be male. All stories are narrated by a male voice,
  so the lead character should be a man or boy. Supporting characters can be any gender.
- Character names and backgrounds must be VARIED across stories — do NOT default to Chinese names.
  Draw from diverse cultures: Japanese, Korean, Southeast Asian, Middle Eastern, European, African,
  Latin American, etc. Match the name to the story's setting and atmosphere, not the visual style.
  The visual style (anime art) is for images only — it does not dictate the story's culture.
- Each part: 800-1000 words
- Each part has as many scenes as the story naturally requires (min 5, max 40).
  Each scene covers 1-3 sentences of the story. Break the story into scenes at every
  meaningful narrative shift — a new location, a new revelation, a new emotional beat.
  More scenes = better image-to-voice sync, so err toward more scenes.
- CRITICAL: Every sentence of the content MUST appear in exactly one scene's narration.
  The narration fields across all scenes, concatenated in order, must equal the full content
  word-for-word. No sentence may be skipped or duplicated.
- Each scene's description MUST capture the single most dramatic, visually striking moment
  of that scene — the peak action, emotional climax, or pivotal reveal. Be cinematic and specific:
  WHO is doing WHAT, their exact expression/posture/action, and what surrounds them.
- For each scene, set show_character: true if the character's face/body is the main visual focus.
  Set show_character: false when the scene is better shown as: an environment (empty room, forest,
  city street), an object (a letter, a weapon, a door), a crowd shot, a wide establishing shot,
  or any moment where the atmosphere/setting matters more than the character's appearance.
  About 10-20% of scenes should have show_character: false for visual variety.
- For each scene, set show_entity: true if the ghost, monster, or supernatural entity is visually
  present and should appear in the image. Set show_entity: false for scenes where the entity is
  not visible (protagonist alone, environment only, objects, flashbacks without the entity).
  Only applies when entity_description is not null.
- CRITICAL — descriptions are sent DIRECTLY to an image generator that takes every word LITERALLY:
  - NO metaphors, similes, or figurative language. If the narration says "she moved like a wave",
    the description must NOT say "wave" — say what the character is literally doing instead.
  - NO abstract concepts ("grief", "hope", "fear") — describe the visible physical action only.
  - ONLY describe what would literally appear in a photograph or painting.
  Bad: "she dances like the waves of the sea" → image generator draws ocean waves.
  Bad: "his anger burned like fire" → image generator draws fire.
  Good: "she spins gracefully across the stone floor, arms outstretched, silk robes billowing".
  Good: "he clenches his jaw, fists shaking at his sides, eyes locked on the figure ahead".
- Each scene has vivid visual keywords focused on the key action, emotion, and atmosphere
  (not just the setting — include the character's state and the dramatic tension)
- Cliffhanger hook at end of each part (1-2 sentences, ultra dramatic)
- thumbnail_title: 3-5 words MAX, clickbait, NO punctuation
  Examples: "She Knew Too Much", "He Was Already Dead", "Nobody Believed Her"
- Facebook caption: 150-200 words, emotional, ends with question + hashtags
- YouTube title: SEO optimized, 60 chars max, includes part number
- YouTube description hook: first 2-3 sentences for the description

Respond with ONLY valid JSON in this exact format:
{
  "overall_title": "string",
  "character_description": "string (highly specific physical description for image consistency — MUST include: unique face feature like scar/unusual eyes/jaw shape, exact hair style and color, specific clothing with color, approximate age, skin tone, build. Example: 'young man mid-20s, lean build, olive skin, sharp angular jaw, short messy dark brown hair with a streak of grey, deep-set amber eyes, wearing a worn dark teal jacket over a grey tunic, small scar above left eyebrow')",
  "entity_description": "string or null (ONLY for stories with a ghost, monster, or recurring supernatural entity — describe its exact appearance in the same specific detail as character_description: skin color/texture, eye appearance, clothing or lack thereof, distinguishing features, how it moves. Example: 'tall female ghost, translucent pale grey rotting skin, black hollow eye sockets with thin red veins at the edges, cracked lips pulled back revealing grey teeth, long black matted hair partially covering her face, wearing a torn white burial dress stained dark at the hem, moves with a slow jerking motion as if her spine is broken'. Set to null if there is no recurring entity.)",
  "style_prompt": "string (specific visual style for this story)",
  "image_seed": number (random integer 1000-9999),
  "parts": [
    {
      "part": 1,
      "title": "string",
      "content": "string (800-1000 words)",
      "hook": "string (cliffhanger ending, 1-2 sentences)",
      "thumbnail_title": "string (3-5 words, no punctuation)",
      "scenes": [
        {
          "scene_number": 1,
          "narration": "string (the exact sentences from content spoken during this scene)",
          "description": "string (cinematic peak moment for image generation — literal visuals only, no metaphors)",
          "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
          "show_character": true,
          "show_entity": false
        }
      ],
      "facebook_caption": "string",
      "youtube_title": "string",
      "youtube_description_hook": "string"
    }
  ]
}
```

### Dark Fantasy Adventure — Seed Options (swap any line above)

**Settings:**
- ancient empire in its final decade — magic is visibly dying and no one can explain why
- underground kingdom built to survive a catastrophe that passed centuries ago, but the exits have been sealed from inside
- desert civilization built directly above a buried god that has begun, very slowly, to move
- archipelago where each island exists in a different century and the tides between them carry travelers through time
- mountain kingdom whose king has not aged in two hundred years, and whose court is more afraid of him than anything outside the walls
- city that exists only between midnight and dawn — it vanishes with the light, along with everyone still inside
- ancient forest cursed by a dying mage who hid the only method to break it somewhere inside
- floating island nation that has been slowly descending for a hundred years and is now close enough to see the ground
- walled city under siege for thirty years whose inhabitants have stopped asking why the siege began
- monastery that serves as the only prison capable of holding what is locked in its deepest level

**Protagonists:**
- disgraced general stripped of rank and given one final impossible mission as a chance at redemption
- court scholar who uncovers proof that the kingdom's founding history — and everything built on it — is a fabrication
- common soldier who survives a battle that both sides have been ordered to deny ever took place
- former royal executioner who carried out a sentence and has since become certain the condemned man was innocent
- merchant whose most recent cargo turns out to be something he was never meant to know existed
- spy who has been so deep undercover for so long he genuinely no longer knows which side he is loyal to
- healer who can cure any wound or illness except the one slowly killing the person he loves most
- orphan whose entire life — family, education, every opportunity — was engineered by someone with a plan he was never told about
- royal cartographer hired to map a territory that is measurably different every time he returns to it
- convicted criminal given his freedom in exchange for a task that becomes more impossible the further into it he gets

**Premises:**
- the prophecy the entire kingdom has built its identity around turns out to describe the villain, not the hero
- the weapon that can end the war can only be used once, and it is currently held by the wrong person for the wrong reason
- the chosen one is a manufactured construct — deliberately selected, trained, and positioned — and has no special power at all
- the price of the kingdom's greatest magical strength is being paid by people who never consented to pay it
- a centuries-old peace agreement is broken and no one alive can remember what it was actually protecting everyone from
- the protagonist discovers that his enemy has been correct about everything, and his own side has been lying since before he was born
- a dying god has chosen the protagonist as its successor, which means inheriting everything — including what destroyed it
- the catastrophe the entire story has been building toward turns out to be the wrong problem entirely
- the curse that was presented as a punishment was the only thing keeping something far worse contained
- two people who have spent years trying to kill each other discover they are the only two who can stop what is coming

---

## After you get the JSON

Save Claude's output as a `.json` file. Then you can import it into the pipeline using:

```bash
# Import the manually generated story into Supabase
# (you will need to add this command to the project, or manually insert via the Supabase dashboard)
```

Or paste the JSON directly into the Supabase `story_parts` table via the dashboard.
