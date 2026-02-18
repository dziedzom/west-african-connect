

# MiddlBrand Corporate Website Redesign

## Overview
A complete visual overhaul transforming the current site into an ultra-minimalist, Swiss Design-inspired corporate identity. The brand name changes from "MiddleBrand" to "MiddlBrand" (no "e", no space). The design language shifts to stark monochrome with a single electric blue accent, glassmorphism navigation, typography-led hero, Bento grid layout, scroll animations, and a massive footer.

---

## 1. Brand Rename

Replace every instance of "MiddleBrand" with "MiddlBrand" across all files:
- Layout.tsx (navbar + footer)
- Index.tsx (hero, CTA, stats)
- About.tsx
- Contact.tsx
- CompanySignUp.tsx
- Pricing.tsx
- Auth.tsx
- index.html (title + meta tags)

---

## 2. Design System Overhaul

### Color Palette (index.css + tailwind.config.ts)
- Background: `#FAFAFA` (off-white)
- Foreground/text: `#1A1A1A` (deep charcoal)
- Accent: Electric Blue `#2563FF` -- used sparingly for buttons and hover states only
- Dark mode: invert to near-black background with light text, accent stays electric blue
- Remove gold/navy color tokens entirely

### Typography
- Headings: Inter, bold weight, very tight letter-spacing (`-0.04em`)
- Body text: `JetBrains Mono` or `IBM Plex Mono` (monospace) for contrast against grotesque headings
- Import new font via Google Fonts in index.css

### Spacing and Radius
- Increase border-radius for cards to `1rem` (Bento aesthetic)
- Generous whitespace throughout

---

## 3. Glassmorphism Floating Navbar (Layout.tsx)

- Rewrite the header as a floating pill/bar centered at the top with `mx-auto`, `max-w-fit`, rounded corners
- Apply `backdrop-blur-xl`, semi-transparent background (`bg-background/60`), subtle border
- Navigation links inside with minimal styling; active state uses accent underline
- Dark mode toggle + auth button included
- Mobile: collapses into a hamburger that opens a full-screen overlay
- Sticky with `fixed top-6 left-1/2 -translate-x-1/2 z-50`

---

## 4. Hero Section (Index.tsx)

- Remove the stock photo background image entirely
- Create a massive, full-viewport typography-led hero
- "MiddlBrand" displayed as an oversized heading (text-7xl to text-9xl) as the visual centerpiece
- Tagline below in monospace body font
- Background: animated CSS grain-gradient mesh using radial gradients with subtle animation (CSS keyframes, no library needed)
- Two CTAs: primary electric blue button + ghost outline button
- Staggered fade-up animation on load

---

## 5. Stats Section (Index.tsx)

- Redesign as a horizontal strip with large monospace numbers
- Minimal dividers, generous padding
- Numbers in accent color on hover

---

## 6. Bento Grid Services Section (Index.tsx)

- Replace the current 4-column feature grid with a Bento Box layout
- Use CSS Grid with varying `row-span` and `col-span` values:
  - 2 large cards (span 2 cols or 2 rows)
  - 2-3 smaller cards
- Cards have large rounded corners (`rounded-2xl`), subtle borders
- Some cards: text content with icon
- Some cards: abstract decorative elements (CSS gradients, geometric shapes)
- On mobile: stack into a single column
- Each card fades up with staggered delay on scroll (Intersection Observer hook)

---

## 7. Scroll Animations (New Hook)

- Create `src/hooks/useScrollReveal.ts` using Intersection Observer API
- Elements start with `opacity-0 translate-y-8` and animate to visible when entering viewport
- Staggered delays for grid children
- Applied to: stats, Bento grid cards, CTA section, About values, Pricing tiers

---

## 8. Button Micro-interactions (button.tsx or index.css)

- Primary buttons: on hover, background fills from left-to-right with a slightly darker accent shade; arrow icon translates right
- Outline buttons: on hover, border color transitions to accent, subtle background tint appears
- Add `transition-all duration-300` and `group` utilities for arrow animation

---

## 9. Massive Footer (Layout.tsx)

- "MiddlBrand" logo text spanning full container width using `text-[8vw]` or similar fluid sizing
- Minimal link columns above the logo
- Monochrome, dark background
- Social links as simple text, not icons
- Copyright in small mono text below

---

## 10. Page-Level Updates

### About.tsx
- Rename to MiddlBrand
- Apply Bento grid to values section
- Add scroll reveal animations

### Pricing.tsx
- Update commission reference text from "MiddleBrand" to "MiddlBrand"
- Apply scroll reveal to tier cards

### Contact.tsx
- Update brand name
- Apply accent color to send button

### CompanySignUp.tsx
- Update brand name references

### Auth.tsx
- Update brand name

---

## 11. Files Changed Summary

| File | Action |
|------|--------|
| `src/index.css` | New color variables, monospace font import, grain animation keyframes, button hover utilities |
| `tailwind.config.ts` | Add mono font family, remove gold/navy, update keyframes for scroll reveal |
| `src/components/Layout.tsx` | Glassmorphism floating navbar, massive footer redesign, rename |
| `src/pages/Index.tsx` | Typography hero, Bento grid, scroll animations, remove hero-bg import, rename |
| `src/pages/About.tsx` | Bento grid values, scroll animations, rename |
| `src/pages/Pricing.tsx` | Scroll animations, rename |
| `src/pages/Contact.tsx` | Accent updates, rename |
| `src/pages/CompanySignUp.tsx` | Rename |
| `src/pages/Auth.tsx` | Rename |
| `src/hooks/useScrollReveal.ts` | New file -- Intersection Observer hook |
| `index.html` | Update title and meta tags |

---

## Technical Notes

- No new dependencies required -- all animations are CSS-based or use native Intersection Observer
- The abstract background uses pure CSS radial gradients with a slow `@keyframes` animation for movement
- Bento grid uses standard CSS Grid (`grid-template-columns`, `grid-row`, `grid-column`) with Tailwind arbitrary values
- The floating navbar uses `fixed` positioning with `backdrop-filter: blur()` for the glassmorphism effect; a `pt-24` spacer is added to `<main>` to offset content
- All existing Shadcn UI components remain in use; only styling classes change
- Mobile responsiveness: Bento grid collapses to single column, floating nav becomes hamburger overlay, hero text scales down with `clamp()` or responsive text classes

