# VibeMove — Design System Handover
Mood-based gym/class booking app (iOS). Source: Dribbble shot 27013671 (Phenomenon Studio). Values are read from screenshots — treat hex as ±5% and refine on first build.

## Personality
Calm, editorial, human. Dark UI with soft earthy accents; serif display with *italic emphasis words*; flat geometric mascot. Tagline: "No class names. Just the right feeling." Avoid: neon, gradients, hard-sell fitness energy.

## Tokens (Design System list shape)
```json
{"name":"VibeMove","version":1,
"color":{"themes":[{"id":"dark","name":"Dark"}],"tokens":[
 {"name":"bg","value":"#121212","usage":"Screen background."},
 {"name":"surface","value":"#1E1E1E","usage":"Cards, tiles, list rows, nav bar."},
 {"name":"surface-2","value":"#2A2A2A","usage":"Chips, inputs, inactive calendar days."},
 {"name":"ink","value":"#F2EFE9","usage":"Primary text (warm off-white)."},
 {"name":"ink-muted","value":"#9A9A9A","usage":"Meta text, labels, inactive nav icons."},
 {"name":"accent","value":"#F07A4E","usage":"Coral: active nav, selected day, primary CTA, progress rings, stat icons."},
 {"name":"accent-ink","value":"#1A1A1A","usage":"Text on accent."},
 {"name":"sage","value":"#4A6B4F","usage":"Hero prompt card, mood screen bg (calm state)."},
 {"name":"indigo","value":"#3A4E8C","usage":"Mood screen bg (balanced state), secondary hero."},
 {"name":"blush","value":"#E8A0C8","usage":"Mascot fill, soft highlight."},
 {"name":"lilac","value":"#B9A6E0","usage":"Mascot fill alt, segmented control active."},
 {"name":"line","value":"#2E2E2E","usage":"Hairline dividers, chart grid."}]},
"type":{"families":{"serif":"\"Instrument Serif\", Georgia, serif","sans":"Inter, system-ui, sans-serif"},
 "groups":[{"name":"Display","family":"serif","styles":[
   {"name":"display","fontSize":"28px","lineHeight":"32px","fontWeight":400},
   {"name":"title","fontSize":"20px","lineHeight":"24px","fontWeight":400},
   {"name":"section","fontSize":"17px","lineHeight":"22px","fontWeight":400}]},
  {"name":"Text","family":"sans","styles":[
   {"name":"body","fontSize":"14px","lineHeight":"20px","fontWeight":400},
   {"name":"label","fontSize":"12px","lineHeight":"16px","fontWeight":500},
   {"name":"stat","fontSize":"18px","lineHeight":"22px","fontWeight":600}]}]},
"spacing":{"tokens":[{"name":"s-2","value":"8px","usage":"Chip gaps, icon-to-label."},{"name":"s-3","value":"12px","usage":"Inside tiles."},{"name":"s-4","value":"16px","usage":"Card padding, screen gutter."},{"name":"s-6","value":"24px","usage":"Between sections."}]},
"radius":{"tokens":[{"name":"r-sm","value":"8px","usage":"Icon chips in list rows."},{"name":"r-md","value":"16px","usage":"Category tiles, stat tiles, inputs."},{"name":"r-lg","value":"24px","usage":"Hero cards, workout cards, mood card."},{"name":"r-pill","value":"999px","usage":"Buttons, tags, nav bar, calendar day."}]}}
```
Type rules: headings and hero copy in serif; emphasise 1–2 words per heading in *italic*. All UI chrome (meta, chips, nav labels) in sans. Numbers in sans 600.

## Components
| Component | Spec |
|---|---|
| Hero prompt card | `sage` bg, r-lg, s-4 pad. Serif display headline w/ italic words + sans body + full-width white pill button (`ink` bg, dark text). Small mascot sticker top-right. |
| Category tile | `surface`, r-md, ~72×72, outline icon + 11px label, horizontal scroll row of 5. Header "Categories" serif + "See all ›" right. |
| Stat tile | `surface`, r-md, 3-up grid; 20px `accent` icon in circle, `stat` number + unit muted. |
| Workout card | `surface`, r-lg, 16:10 image top (heart save icon top-right), title sans 14/500, meta row (calendar/intensity icons, muted), row of tag chips. Horizontal carousel, peek next card. |
| Tag chip | `surface-2`, r-pill, label 11px, 10px h-pad. Vocab: Energizing · Power · Strength · Chill · Sweaty · Explosive · Slow · Social. |
| Mood picker | Full-bleed `sage`/`indigo` screen; serif question "George, how do you *feel right* now?"; big mascot; horizontal wheel of words, selected = outlined pill serif italic; helper text in translucent card; `accent` pill CTA "Let's find workout". |
| Calendar strip | 7 days, selected day = `accent` r-md block with white text. Day list rows: time range muted + title + trainer, icon chip left, "Join" pill right. |
| Segmented control | `surface-2` track r-pill, active segment `sage`/`lilac`. |
| Charts | Dot-matrix (steps, `accent` filled dots on `surface-2`), ring (calories, `accent` on `line`), area line (`accent` fill 30%). |
| Goal row | Title + chips (frequency, date) + mini progress ring right with value. |
| Bottom nav | Floating `surface` pill, 5 outline icons, active = `accent` filled circle with dark icon. |
| Top bar | Avatar 36 + "Welcome back" muted / name serif; bell + points pill (`surface-2`, icon + "21"). |

## Illustration
Mascot = single flat geometric shape (pentagon, starburst, blob) in `blush`/`lilac`, line-art face/arms/legs in `ink`. One per mood state. Keep stroke 2px, no shading.
