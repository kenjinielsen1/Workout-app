# Design

> Companion to all specs. Captures the visual direction as tokens and constraints, not screenshots. If a rebuild reaches for `rounded-lg`, `bg-gray-50`, and `blue-500`, this doc failed — read it first.

## The thesis

The app is an evidence-based assistant that knows when to push and when to hold. It says "repeat this week" more often than "add weight," because that's what the research says. **The design is a coach, not a hype man:** quiet, mechanical, unimpressed by a normal day, and emphatic exactly once — when something real happens.

The whole aesthetic follows from one fact about use: this screen is read one-handed, mid-set, from four feet away, under gym lighting, with chalk on the hands.

## Tokens

```
--iron        #17181A   page background (warm dark gray, green in it — NOT near-black)
--iron-raised #202225   subordinate instrument tiles
--chalk       #E8E4D9   primary numerals and text (bone, NOT white)
--chalk-dim   #B9BCB4   secondary values
--gray-green  #7E837C   rationale, body copy
--gray-mute   #62665F   labels, eyebrows
--hairline    #2E3033   dividers
--border      #3A3D40   secondary button outline
--copper      #C8703C   PR ONLY — see below
```

Dark by default. Not for fashion — gyms are dim and the phone is 18 inches from your face between sets. A light-mode-first fitness app is one that never considered where it's used.

## The four rules

### 1. The number is the screen

Working weight at ~96px, cropped tight, line-height ~0.82, letter-spacing -0.04em. Everything else — rationale, plate math, e1RM, rest — at 10–14px.

The asymmetry **is** the design. A template makes four equal cards; this makes one object and demotes everything else to instrumentation around it. If a future screen renders the rationale as prominent as the number, the design is gone.

No card grid. Content has hierarchy — today's target matters 10× more than set history — and the layout must be violently unequal about it. If everything is a card, nothing is important.

### 2. Copper appears only on a PR

`--copper` is used on the personal-record screen and nowhere else in the app. Not on buttons, not on chart lines, not on active states, not on a "good job" toast.

This constraint carries more weight than the color choice. The moment copper appears somewhere ordinary, the PR moment stops meaning anything. Everything else in the app is iron, chalk, and gray-green.

### 3. Tabular numerals, always

`font-variant-numeric: tabular-nums` on every weight, rep count, timer, e1RM, and volume figure. Numbers must not jitter as they change. Nobody notices consciously; everybody feels it. It's the difference between machined and assembled.

### 4. Coach voice, not hype voice

- "New best." "Missed." "Hit target." "Keep going."
- Never: "Crush it," "Amazing work," "You're on fire," exclamation marks, confetti.
- Sentence case. Plain verbs. No filler.
- Deload copy is matter-of-fact and frames the back-off as engineered, not as failure (see `FEATURES.md` #3).
- The engine's restraint and the copy's restraint must agree. An app that says "repeat" while shouting contradicts itself.

## The signature moment

The PR is the one place boldness is spent: screen shake, count-up on the new e1RM, copper arriving all at once, the delta against the previous best. Loud, brief, earned.

Everything else stays quiet and disciplined so this lands. One memorable moment beats uniform polish — and it's the thing people describe to someone else.

Respect `prefers-reduced-motion`: skip the shake and count-up, keep the copper and the number.

## Physical-context constraints

- Tap targets well above the 44px minimum — sized for chalky thumbs, not for a mouse.
- Primary action (`Hit target`) is chalk-on-iron and twice the width of the secondary. One clear action per screen.
- Readable at arm's length from a bench. If a number needs a squint, it's too small.

## Don't

The tells that read as "made fast, decided nothing" — this stack ships all of them by default:

- Inter / system-ui as the display face for numerals
- `rounded-lg` on everything; `bg-gray-50` page with white `shadow-sm` cards
- `blue-500` primary
- Equal padding, equal cards, everything centered
- Gradients, glows, drop shadows, neon
- Near-black background with a single acid-green or vermilion accent — this is a recognizable AI-design default right now, and it's exactly where a strength app instinctively goes. The warm iron/chalk/copper palette above exists specifically to avoid it.
- Confetti, badges, streak flames, anything that rewards training while flagged for fatigue (see `SCOPE_SAFETY.md`)

## Quality floor

Responsive to mobile (it *is* mobile), visible keyboard focus, reduced motion respected, contrast readable in a dim room. Build to it without announcing it.

## Open

The display face is currently system sans. A condensed or industrial numeral face — something with mechanical weight — would push this considerably further from default. That's a font-licensing decision, not a code one. Revisit before public release.

---

## As-built notes

The token block lives in `src/index.css`. The app already used a Tailwind `@theme`
remap of the `neutral-*` and `emerald-*` ramps to reskin every screen without
per-component edits; that lever is preserved:

- `neutral-*` is remapped to the iron/chalk ramp (page/tiles/borders → iron; body
  text → chalk / chalk-dim / gray-green / gray-mute).
- `emerald-*` (the old crimson accent) is remapped to quiet iron/chalk so no accent
  hue survives anywhere. There is no app-wide accent color — rule 2.
- `--copper` is a CSS variable used **only** by the live PR celebration
  (`PrCelebration`). Historical PR badges and chart series are chalk, never copper.
- `tabular-nums` is set on `body`, so every numeral is tabular by default (rule 3).
- The primary action (`Hit target`) is a solid chalk fill with iron text, twice the
  width of the secondary — the one bold non-PR element per screen.
