# MiddlBrand visual-system redesign direction

## Direction

**Quiet authority:** preserve the near-white/near-black foundation, remove the mechanical “everything is data” feeling, and create hierarchy through type, spacing, alignment, and selective contrast. The public site should feel composed and persuasive; the product should feel fast, precise, and information-rich.

The redesign is a system change, not an Apple imitation. It borrows disciplined pacing, optical hierarchy, restrained motion, and careful details while retaining MiddlBrand’s own procurement and African-market identity.

## 1. Typography

### Typeface roles

- **Reading/body: Source Sans 3** — replaces JetBrains Mono for paragraphs, descriptions, forms, FAQs, navigation, tables, and long Bid Studio output. It has open forms, strong screen readability, and broad language support.
- **Data: JetBrains Mono** — retained only for deadlines, contract values, match scores, tender/reference numbers, source names, timestamps, and compact status metadata.
- **Display/headline:** choose one of the two options below. Inter is removed from the proposed system rather than retained by default.

### Display type alternatives

Both options keep Source Sans 3 for body and interface copy.

#### Option A — Instrument Sans (recommended)

- **Character:** contemporary, editorial, and assured, with more personality than Inter without becoming fashion-led or decorative.
- **Display XL specimen:** `MiddlBrand` — **88px / 620 / 86px line height**.
- **H2 specimen:** `Built around verifiable data` — **36px / 600 / 42px line height**.
- **Why it fits:** the open shapes and subtly expressive proportions create a premium public voice, while remaining crisp for dashboard headings.
- **Trade-off:** quieter than Sora; distinction comes from composition and hierarchy rather than visibly geometric letterforms.

#### Option B — Sora

- **Character:** geometric, modern, and recognisable, with strong silhouettes at large sizes.
- **Display XL specimen:** `MiddlBrand` — **84px / 600 / 84px line height**.
- **H2 specimen:** `Built around verifiable data` — **36px / 600 / 42px line height**.
- **Why it fits:** gives MiddlBrand a more ownable digital-product voice and a sharper contrast against the humanist Source Sans 3 body.
- **Trade-off:** more overtly “tech”; it requires restrained weight and accent use to avoid returning to a startup-SaaS feel.

### Public-page scale

| Role | Desktop | Mobile | Weight | Line height | Use |
|---|---:|---:|---:|---:|---|
| Display XL | 88px | 52px | 650 | 0.98 | Homepage H1 only |
| Display L | 64px | 44px | 650 | 1.02 | Major campaign/page statement |
| H1 | 52px | 38px | 650 | 1.08 | Standard public page title |
| H2 | 36px | 30px | 620 | 1.16 | Main section title |
| H3 | 24px | 22px | 600 | 1.25 | Feature or plan title |
| Lead | 20px | 18px | 400 | 1.55 | Introductory copy |
| Body L | 18px | 17px | 400 | 1.65 | Editorial body copy |
| Body | 16px | 16px | 400 | 1.6 | Default reading text |
| Small | 14px | 14px | 450 | 1.5 | Supporting copy |
| Label | 12px | 12px | 600 | 1.3 | Eyebrows and compact labels |
| Data | 13px | 13px | 500 mono | 1.4 | Values, dates, references |

This creates clear jumps rather than the current cluster of 12–16px text: **16 → 24 → 36 → 52 → 88**.

### App scale

| Role | Size | Weight | Line height | Use |
|---|---:|---:|---:|---|
| App H1 | 30px | 650 | 1.15 | Screen title |
| App H2 | 20px | 620 | 1.25 | Workspace section |
| App H3 | 16px | 600 | 1.35 | Panel/list title |
| UI body | 14px | 400 | 1.45 | Controls and descriptions |
| UI small | 12px | 450 | 1.4 | Supporting metadata |
| Data dense | 12–13px | 500 mono | 1.35 | Deadlines, values, IDs, sources |

- Headline tracking becomes **-0.025em**, not the current global -0.04em.
- Body and data tracking remain **0**.
- Line length: **58–68 characters** for public reading copy; app descriptions cap around **80 characters** before truncation or expansion.
- Avoid all-caps for prose. Reserve it for 11–12px labels with modest **0.06em** tracking.

## 2. Spatial rhythm

### Shared base

Use an 8px rhythm with a small 4px half-step:

`4, 8, 12, 16, 24, 32, 48, 64, 80, 112, 144`

### Public/marketing pages

- Maximum page canvas: **1280px**.
- General content width: **1120px**.
- Reading column: **640–680px**.
- Wide comparison/data section: **1180px**.
- Desktop side gutters: **48px**; tablet **32px**; mobile **20px**.
- First content after navigation: **96px** top clearance.
- Major section spacing: **144px desktop / 96px tablet / 72px mobile**.
- Related blocks inside a section: **48–64px**.
- Heading to lead copy: **24px**; lead to action: **32px**.
- Cards are not the default section container. Use open layouts, rules, and full-width tonal bands; cards remain for plans, repeated features, and framed tools.
- Marketing cards: **32–40px** internal space, **8px radius**, **24px** grid gap.

This replaces the current repeated `py-24 + gap-4 + p-6` rhythm with distinct beats: introduction, proof, explanation, decision.

### App/listings/Bid Studio

- Maximum working canvas: **1440px**, with **24–32px** gutters.
- Screen top/bottom space: **32px**; section gaps: **24–32px**.
- Panel internal space: **16–20px**; list-row vertical space: **12–16px**.
- Grid gap: **12px** for dense data, **16px** for work panels.
- Controls: **36px** standard height, **32px** compact height.
- App radius: **6px** controls, **8px** panels. Pills only for statuses, filters, and compact binary choices.
- RFP rows gain stable columns for title/issuer, location/category, value, deadline, source, and action so scanning does not depend on card-by-card reading.

## 3. Motion

### Motion principles

- Motion explains entry, hierarchy, or state change; it does not decorate every surface.
- Remove the global **1.03x magnetic scale** and blue glow from buttons/cards.
- No animated grain or continuously moving background on reading-heavy pages.

### Motion values

- Section reveal: **opacity 0→1 + translateY 16px→0**, **600ms**, easing `cubic-bezier(0.22, 1, 0.36, 1)`.
- Child stagger: **70ms**, maximum **5 children**; after that, reveal as one group.
- Hero sequence: headline, lead, actions over **800ms total**, once on entry.
- App panel entry: **200ms fade only**; no stagger on dashboards after initial load.
- Button/control feedback: **140ms** colour/border transition; pressed state **translateY(1px)**, no scale.
- Card/list hover: **160ms**, background or border shift only; optional **translateY(-1px)** on marketing cards, never dense rows.
- Modal/drawer: **240ms** with 8px movement.
- Respect reduced-motion by removing transforms and showing content immediately.
- Scroll-linked behaviour is limited to section reveal/progress cues; no parallax on task screens.

## 4. Colour

### Core palette

- **Canvas:** `#FAFAFA` — retained.
- **Ink:** `#1A1A1A` — retained.
- **Surface:** `#FFFFFF`.
- **Subtle surface:** `#F3F4F2` — warmer than generic blue-gray.
- **Primary muted text:** `#5F625F`.
- **Hairline:** `#DCDDDA`.
- **Strong rule:** `#B9BCB8`.

### Accent alternatives

Each row shows the accent between the fixed canvas and ink: `canvas → accent → ink`.

| Option | Palette against canvas and ink | Rationale | Foreground rule |
|---|---|---|---|
| **Signal Vermilion — recommended** | `#FAFAFA → #D6402F → #1A1A1A` | Decisive, energetic, and uncommon in procurement software. It makes actions feel intentional and gives MiddlBrand a recognisable editorial signature without relying on gradients. | Light text on solid accent; soft tint `#FBEAE7`; hover `#B93427`. |
| **Deep Ultramarine** | `#FAFAFA → #3446C8 → #1A1A1A` | Keeps the trust and digital clarity of blue but moves away from the bright SaaS default into a deeper, ink-like hue. It works especially well for active states and data emphasis. | Light text on solid accent; soft tint `#EBEDFA`; hover `#2938A8`. |
| **Electric Citron** | `#FAFAFA → #C7DB19 → #1A1A1A` | The most ownable and contemporary option. Used sparingly, it creates a sharp signal against the neutral system and makes key actions unmistakable. | **Ink text**, never light text, on solid accent; soft tint `#F5F8D8`; hover `#B4C600`. |

**Recommendation:** Signal Vermilion. It is distinctive without becoming playful, separates MiddlBrand from fintech/health conventions, and supports the confident editorial tone. Deep Ultramarine is the safer alternative; Electric Citron is the boldest.

The chosen accent does not replace semantic colours: success remains green, warning amber, destructive red, and information blue.

### Accent allocation

Use accent for:

1. Primary action backgrounds.
2. Active navigation/tab/filter state.
3. Links and keyboard focus rings.
4. A single key figure or proof point within a section.
5. Selected rows and meaningful progress.

Do **not** use accent for every icon, every card border, decorative gradients, broad background washes, or hover glows. Most icons inherit ink/muted text. On a typical public viewport, accent should occupy roughly **5–8%** of the visible colour area; app screens **3–5%**.

## 5. Marketing versus app

### One system, two density modes

| Property | Public pages | App, listings, Bid Studio, admin |
|---|---|---|
| Goal | Understand, trust, decide | Scan, compare, act |
| Canvas | 1120–1280px | 1280–1440px |
| Section gap | 112–144px | 24–32px |
| Default body | 16–18px Source Sans 3 | 14px Source Sans 3 |
| Main heading | 52–88px | 30px |
| Panel padding | 32–40px | 16–20px |
| Grid gap | 24px | 12–16px |
| Radius | 8px | 6–8px |
| Motion | Section choreography | Immediate state feedback |
| Mono | Proof/data moments | Dates, values, IDs, sources, scores |

### Public application

- Homepage: reduce the empty first viewport while keeping a large, confident brand statement; reveal a visible hint of live proof below it.
- About: turn the numbered process into a paced editorial sequence rather than one large text card.
- Pricing: make plan selection visually decisive, then place comparison and fee explanation into clear full-width bands.
- Footer: keep the approved tagline; improve reading type and hierarchy without adding claims.

### Product application

- Listings: replace oversized stacked cards with scan-friendly rows on desktop and compact cards on mobile; metadata uses mono selectively. **Contract value is conditional, not a permanent empty column:** while recorded values remain unavailable, the desktop layout reallocates that track to title/issuer and omits value entirely. Once extraction produces real values, the value column appears only when the current result set contains at least one recorded value; missing individual values display a muted em dash, never “TBD” or an invented range.
- Dashboard: reduce ornamental cards and repeated icon-accent treatment; group by workflow priority, keep key actions above the fold, and use denser summaries.
- Bid Studio: preserve generous space in writing/review canvases, while controls, history, scores, and tender metadata use compact app density.
- Admin: use table/list density and stable columns; reserve cards for rollups, not every record.

## Scope of a later implementation

1. Create semantic typography, spacing, radius, colour, and motion tokens.
2. Update shared text, button, badge, card, table, form, navigation, and reveal primitives.
3. Apply the public mode to Home, About, Pricing, Partnerships, Join, Contact, Learn, and the footer.
4. Apply the app mode to RFP Listings, Dashboard, Bid Studio, proposal/history screens, profile/verification, and admin workspaces.
5. Verify light/dark contrast, reduced motion, mobile layouts, long tender titles, empty/loading states, and high-density desktop views.
6. Preserve all existing data, scraper, filters, subscriptions, self-serve, managed-bid, verification, and admin behaviour.

## Validation targets

- Paragraph copy is never set in mono.
- All metadata classified as data uses the mono role consistently.
- Public reading text meets WCAG AA and stays within the target line length.
- No global scale/glow hover remains.
- Marketing pages show a clear next-section cue in the first viewport.
- App screens expose more useful information above the fold than today without reducing control hit areas below 32px.
- The accent is used only for meaning, focus, and primary action.
