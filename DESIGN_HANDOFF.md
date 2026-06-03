# VITAL — Frontend Design Handoff

A self-contained brief for designing the VITAL mobile interface. Everything a
designer needs: the framework, design tokens, typography, screen inventory, and
the component library with prop contracts. The app is **dark-mode only**,
**mobile-first** (iOS + Android), built to run in **Expo Go**.

> Brand line: **"Know your body. Before it fails you."**
> Aesthetic: clinical, premium, calm. Deep near-black backgrounds, restrained
> gold accent, serif display numerals, monospace labels. Think "private health
> concierge," not "consumer fitness app."

---

## 1. Framework & libraries

| Concern | Choice | Notes for design |
|---|---|---|
| App framework | **Expo (React Native)** | iOS + Android from one codebase |
| Navigation | **Expo Router** (file-based) | Stacks + a 3-tab bottom bar |
| Styling | **NativeWind** (Tailwind for RN) | Tokens map to Tailwind classes (below) |
| Animation | **React Native Reanimated 3** | Pulse, progress, success checkmark, toasts |
| Forms | **React Hook Form + Zod** | Inline field validation |
| Charts | **react-native-svg** | Custom range bar + history line chart (Skia-free for Expo Go) |
| Icons | **lucide-react-native** | Icon names referenced by string throughout |
| Payments UI | **react-native-webview** | Paymob iframe rendered in a WebView |

---

## 2. Design tokens

### Colors

```
obsidian     #090B0E   app background (deepest)
deep         #0D1117   nav bars, bottom sheets, sticky bars
surface      #131920   cards, inputs, tiles
border       #1E2830   hairline borders / dividers
borderLight  #243040   raised borders, toggles
gold         #C9A84C   primary accent, CTAs, active state
goldLight    #E8C878   accent highlight
goldDim      #8A6E30   muted accent / background glow
text         #D4DCE8   body text
textDim      #7A8FA6   secondary text, labels
textMuted    #3D5068   placeholders, disabled, "untested"
white        #F0F4F8   high-emphasis headings/values
red          #E05252   alert status
green        #4CAF84   optimal status
cyan         #4A9FB5   links / informational
```

### Status color system (used everywhere a biomarker appears)

| Status | Meaning | Color | Label shown |
|---|---|---|---|
| `optimal` | within VITAL's functional-optimal window | `#4CAF84` green | "Optimal" |
| `suboptimal` | within lab-normal but outside optimal | `#C9A84C` gold | "Review" |
| `alert` | outside lab-normal entirely | `#E05252` red | "Alert" |
| `untested` | no result yet | `#3D5068` muted | "Untested" |

### Typography

| Role | Font | Weight | Used for |
|---|---|---|---|
| Display | **Cormorant Garamond** (serif) | 300 | Big numbers, screen titles, biomarker names, values |
| Label / code | **DM Mono** (monospace) | 300 | Category labels, stats, units, badges, section headers (UPPERCASE, wide tracking) |
| Body | **Instrument Sans** (sans) | 400 | Descriptions, paragraphs, form text |

Typical sizes in use: display 64 (logo) / 38–44 (values & titles) / 24–32 (headers); body 13–15; mono labels 9–12 (uppercase, letter-spacing wide).

### Shape & spacing

- Radius: `sm 2 · md 4 · lg 8` (cards/inputs use md–lg; pills are fully rounded)
- Spacing scale: `4 · 8 · 12 · 16 · 24 · 32`
- Screen horizontal padding: **20px**
- Cards: `surface` fill, `border` 1px, radius 8, padding 16–20

---

## 3. Screen inventory

Grouped by flow. Each is a real route in the app.

### Onboarding `(auth)`
1. **Welcome** — full-screen splash. Centered "VITAL" serif wordmark in gold, pulsing radial gold glow behind it, tagline, two stacked CTAs (Get Started / Sign In) pinned to bottom.
2. **Sign Up** — full name, email, password, Egyptian phone (+20). Terms checkbox, "OR" divider, Google button, link to login.
3. **Login** — email, password, "Forgot password?", Google button, link to signup.
4. **Health Profile** — multi-step, **one question per screen**, thin gold progress bar at top. Steps: DOB (shows computed age), Sex (choice list), Height/Weight (shows computed BMI), Chronic conditions (multi-select), Family history (multi-select). Continue + Back buttons.
5. **Goals** — 2-column card grid, each card an icon + label; select up to 3 (selected = gold tint + border). "n/3 selected" counter.

### Subscription `subscription/`
6. **Plans** — Annual / Monthly-equivalent toggle. Two `PlanCard`s (Basic, Premium). Premium is recommended: gold border + "Most Popular" badge. Below: a feature-by-feature **comparison table**. "Maybe later" link.
7. **Checkout** — plan summary card with **subtotal → 14% VAT → total** breakdown, list of payment methods (Card, Vodafone Cash, Fawry, Meeza), terms checkbox, "Pay {total} EGP" button. Tapping Pay swaps the screen for a full-screen **Paymob WebView** with a Cancel header.
8. **Confirmation** — animated green success checkmark (spring scale-in), "You're all set", subscription detail card (plan / tests-per-year / expiry), two CTAs (View Dashboard / Book First Test).

### Main app `(tabs)` — bottom tab bar (Dashboard · Biomarkers · Profile)
9. **Dashboard** — "Welcome back, {name}". If no subscription: a subscribe prompt. Else: a hero card with a **ProgressRing** (% of tested markers that are optimal) + summary text, a subscription summary strip, and a horizontal row of category cards.
10. **Biomarkers (library)** — title, horizontal **category overview cards** row, search bar, horizontal **category filter pills**, **status filter pills**, a sort control + grid/list toggle, then the biomarker list/grid. Has loading skeletons, empty state, and a subscription-locked state.
11. **Profile** — avatar + name + email, health-profile summary rows, goals, subscription card, Sign Out.

### Biomarker detail `biomarker/`
12. **Biomarker Detail** — the richest screen, scrollable long-form:
    - **Header**: category badge, large serif name, large value + unit, status badge, last-tested date
    - **Range** section: a toggle (Lab Normal / Optimal) and a 5-zone `RangeBar` (red·gold·green·gold·red) with the user's value marker
    - **History**: SVG line chart with a shaded green optimal band, tappable points with tooltip; single-point state shows "Test again to see your trend"
    - **What this measures** (paragraph)
    - **Why it matters** (bulleted)
    - **What affects this marker** (paragraph)
    - **Related biomarkers** (horizontal card scroll)
    - **Sticky bottom bar**: "Book a Test" (secondary) + "Add Result" (primary)
    - **Manual result bottom sheet**: value, test date, lab name, notes
13. **Category Detail** — header (icon tile + name + count), a `ProgressRing` + description card, the category's biomarker list, a "Why this category matters" blurb, and a related-categories pill row.

The 8 categories (color-coded everywhere): Metabolic `#4CAF84`, Hormonal `#C9A84C`, Cardiovascular `#E05252`, Vitamins & Nutrients `#4A9FB5`, Inflammation `#E0844A`, Thyroid `#9B7FD4`, Liver & Kidney `#6B9E6B`, Complete Blood Count `#B55A7A`.

---

## 4. Component library (props = the design contract)

These are the reusable building blocks. Designing these well covers ~90% of the UI.

- **Button** — `variant: primary | secondary | ghost`, `loading`, `disabled`, `icon`. Primary = gold fill / obsidian text; secondary = surface fill / borderLight border; ghost = text only. Labels are UPPERCASE mono.
- **StatusBadge** — `status`, `size: sm | md`. Pill with a colored dot + uppercase label, tinted background of the status color.
- **BiomarkerCard** — `view: list | grid`. List: category dot + name + "value unit · date" + StatusBadge. Grid: dot + status dot top row, name, value at bottom. Supports search-term highlight (matched substring in gold).
- **CategoryCard** — icon tile, name, "{n} markers", status summary ("4 optimal · 1 review"), **color-coded left border**. Fixed width ~160 for horizontal scroll.
- **PlanCard** — plan name (mono), big serif price + "/year" or "/mo", feature list with green checks, "Choose Plan" button. `recommended` adds gold border + "Most Popular" badge.
- **RangeBar** — horizontal 5-zone bar (red · gold · green · gold · red) with a white value marker; `mode: optimal | normal` switches which thresholds are emphasized; threshold labels beneath.
- **HistoryChart** — line chart over time, shaded green optimal band, tappable points → tooltip. Empty + single-point states.
- **ProgressRing** — circular ring (0–1), center shows % + a small sublabel ("optimal"). Color configurable per category.
- **SectionHeader** — uppercase gold mono title, optional subtitle, optional right-aligned action link (cyan).
- **BottomSheet** — slide-up panel over a dimmed backdrop, grab handle, optional title, scrollable body. Keyboard-aware.
- **FormField** — uppercase mono label above a surface input; red border + red helper text on error.
- **ProgressBar** — thin (4px) animated gold fill on a border track (onboarding).
- **Skeleton / SkeletonList** — shimmering placeholders (border-colored, opacity pulse).
- **EmptyState** — centered icon-in-circle, serif title, dim message, optional CTA. Used for no-results, no-subscription (lock icon), and errors.
- **Toast** — top-of-screen slide-in notice; accent border by kind (error red / success green / info cyan).
- **FilterPills** — horizontal scroll of single-select pills; active pill uses the accent color tint + border.

---

## 5. Interaction & state notes for design

- **Auth gate**: unauthenticated users only reach the `(auth)` flow.
- **Subscription gate**: without an active subscription, the Biomarkers tab and Dashboard show a locked / subscribe-prompt state instead of data — design these "locked" states intentionally (they're a conversion surface).
- **Animations present**: welcome glow pulse, onboarding progress bar, success checkmark spring, toast slide, skeleton shimmer, chart point selection.
- **Everything is dark.** No light theme in Phase 1.
- **Numbers are the hero.** Lean on the serif display font for values and titles; keep labels small, uppercase, monospaced, and dim.

---

## 6. Out of scope (don't design these for Phase 1)

AI coach, composite "health score", lab-results import, push notifications,
enterprise dashboards, imaging, genetics, supplement store, social/sharing.
