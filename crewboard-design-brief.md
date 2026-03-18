# CrewBoard — Frontend Design Brief

> Design system and visual guidelines for a clean, modern flight schedule generator.

---

## 1. Design Direction

### Aesthetic
Light, modern SaaS-style. Clean whites, subtle shadows, generous spacing. The app should feel professional and trustworthy — like a well-designed productivity tool, not a game. Think Linear, Vercel Dashboard, or Notion — but with an aviation identity.

### Personality
- **Confident**: Clean typography, no visual clutter
- **Operational**: Data-forward, tables and forms are first-class citizens
- **Aviation-flavoured**: Subtle nods to aviation (iconography, terminology) without going full cockpit-instrument theme

---

## 2. Design Tokens

### 2.1 Color Palette

**Primary (Brand)**
```
--color-primary-50:  #EFF6FF    (lightest tint — backgrounds)
--color-primary-100: #DBEAFE
--color-primary-200: #BFDBFE
--color-primary-300: #93C5FD
--color-primary-400: #60A5FA
--color-primary-500: #3B82F6    (main brand — buttons, links)
--color-primary-600: #2563EB    (hover states)
--color-primary-700: #1D4ED8    (active/pressed)
--color-primary-800: #1E40AF
--color-primary-900: #1E3A8A
```

**Neutral (Grays)**
```
--color-neutral-50:  #F9FAFB    (page background)
--color-neutral-100: #F3F4F6    (card backgrounds, table headers)
--color-neutral-200: #E5E7EB    (borders, dividers)
--color-neutral-300: #D1D5DB    (disabled states)
--color-neutral-400: #9CA3AF    (placeholder text)
--color-neutral-500: #6B7280    (secondary text)
--color-neutral-600: #4B5563    (body text)
--color-neutral-700: #374151    (strong text)
--color-neutral-800: #1F2937    (headings)
--color-neutral-900: #111827    (primary text)
```

**Semantic**
```
--color-success-50:  #F0FDF4
--color-success-500: #22C55E    (saved, complete)
--color-success-700: #15803D

--color-warning-50:  #FFFBEB
--color-warning-500: #F59E0B    (caution, pending)
--color-warning-700: #B45309

--color-error-50:    #FEF2F2
--color-error-500:   #EF4444    (errors, destructive actions)
--color-error-700:   #B91C1C

--color-info-50:     #EFF6FF
--color-info-500:    #3B82F6    (same as primary)
```

### Tailwind Config Mapping

These should be added to `tailwind.config.ts` under `extend.colors`:

```typescript
colors: {
  brand: {
    50: '#EFF6FF',
    100: '#DBEAFE',
    200: '#BFDBFE',
    300: '#93C5FD',
    400: '#60A5FA',
    500: '#3B82F6',
    600: '#2563EB',
    700: '#1D4ED8',
    800: '#1E40AF',
    900: '#1E3A8A',
  },
  // Neutrals use Tailwind's default gray scale (already available)
}
```

### 2.2 Typography

**Font Stack**
```
--font-sans: 'Inter', system-ui, -apple-system, sans-serif
```

Install Inter via `next/font/google` for optimal loading:
```typescript
import { Inter } from 'next/font/google'
const inter = Inter({ subsets: ['latin'] })
```

**Type Scale**

| Token | Size | Weight | Line Height | Usage |
|-------|------|--------|-------------|-------|
| `text-xs` | 12px | 400 | 16px | Labels, badges, metadata |
| `text-sm` | 14px | 400 | 20px | Secondary text, table cells |
| `text-base` | 16px | 400 | 24px | Body text, form inputs |
| `text-lg` | 18px | 500 | 28px | Section titles |
| `text-xl` | 20px | 600 | 28px | Card headings |
| `text-2xl` | 24px | 700 | 32px | Page titles |
| `text-3xl` | 30px | 700 | 36px | Landing page headings |

**Font Weight Usage**
- 400 (normal): Body text, descriptions
- 500 (medium): Labels, navigation items, table headers
- 600 (semibold): Card titles, section headings, buttons
- 700 (bold): Page titles, hero text

### 2.3 Spacing

Use Tailwind's default spacing scale. Key decisions:

| Context | Spacing |
|---------|---------|
| Page padding (horizontal) | `px-4` mobile, `px-6` tablet, `px-8` desktop |
| Page max width | `max-w-6xl mx-auto` |
| Section gaps | `space-y-8` |
| Card padding | `p-6` |
| Form field gaps | `space-y-4` |
| Inline element gaps | `gap-2` or `gap-3` |
| Table cell padding | `px-4 py-3` |

### 2.4 Border Radius

```
--radius-sm:  6px   (badges, small elements)
--radius-md:  8px   (buttons, inputs)
--radius-lg:  12px  (cards, modals)
--radius-xl:  16px  (large containers)
```

Tailwind mapping: `rounded-md` for most elements, `rounded-lg` for cards, `rounded-xl` for page-level containers.

### 2.5 Shadows

```
--shadow-sm:   0 1px 2px rgba(0, 0, 0, 0.05)                   (inputs, small cards)
--shadow-md:   0 4px 6px -1px rgba(0, 0, 0, 0.07),
               0 2px 4px -2px rgba(0, 0, 0, 0.05)              (cards, dropdowns)
--shadow-lg:   0 10px 15px -3px rgba(0, 0, 0, 0.08),
               0 4px 6px -4px rgba(0, 0, 0, 0.04)              (modals, elevated content)
```

Use Tailwind's `shadow-sm`, `shadow-md`, `shadow-lg`.

---

## 3. Component Patterns

### 3.1 Buttons

**Primary** (main actions: Generate, Save)
```
bg-brand-500 hover:bg-brand-600 active:bg-brand-700
text-white font-semibold
px-4 py-2.5 rounded-md
transition-colors duration-150
shadow-sm
```

**Secondary** (secondary actions: Regenerate, Back)
```
bg-white hover:bg-gray-50
text-gray-700 font-medium
border border-gray-300
px-4 py-2.5 rounded-md
transition-colors duration-150
shadow-sm
```

**Destructive** (Delete)
```
bg-white hover:bg-red-50
text-red-600 font-medium
border border-red-200 hover:border-red-300
px-4 py-2.5 rounded-md
```

**Ghost** (subtle actions: links in tables)
```
hover:bg-gray-100
text-gray-600 hover:text-gray-900
px-3 py-2 rounded-md
```

**All buttons**: Include a disabled state with `opacity-50 cursor-not-allowed` and a loading state with a spinner replacing the label text.

### 3.2 Form Inputs

```
w-full
bg-white
border border-gray-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20
text-gray-900 placeholder:text-gray-400
px-3 py-2.5 rounded-md
text-base
transition-colors duration-150
```

**Select dropdowns**: Same styling as inputs. Use native `<select>` for MVP — custom dropdowns are a future enhancement.

**Labels**:
```
text-sm font-medium text-gray-700
mb-1.5 block
```

**Helper text**:
```
text-sm text-gray-500 mt-1
```

**Error state**:
```
border-red-300 focus:border-red-500 focus:ring-red-500/20
```
Error message: `text-sm text-red-600 mt-1`

### 3.3 Cards

The main container pattern for content sections:

```
bg-white
border border-gray-200
rounded-lg
shadow-sm
p-6
```

### 3.4 Schedule Table

The most important visual component. Should feel clean and scannable.

**Table container**: Inside a card, no extra padding (table goes edge-to-edge within the card).

**Table header**:
```
bg-gray-50
text-xs font-medium text-gray-500 uppercase tracking-wider
px-4 py-3
text-left
border-b border-gray-200
```

**Table rows**:
```
px-4 py-3
text-sm text-gray-900
border-b border-gray-100
```

**Pair grouping**: Alternate pair backgrounds to visually group out-and-back flights:
- Pair 0 (flights 1 & 2): `bg-white`
- Pair 1 (flights 3 & 4): `bg-gray-50/50`
- Pair 2 (flights 5 & 6): `bg-white`
- (alternating)

**Direction indicator**: Show a subtle arrow or label for outbound/return:
- Outbound: `→` or small badge with "OUT" in `text-brand-600 bg-brand-50`
- Return: `←` or small badge with "RTN" in `text-gray-600 bg-gray-100`

**Aircraft type cell**: Use `font-mono text-sm` for ICAO codes to give them a technical feel.

**ICAO airport codes**: Also `font-mono` for visual consistency.

### 3.5 Past Schedules List

Each saved schedule as a list item within a card:

```
flex items-center justify-between
px-4 py-3
border-b border-gray-100 last:border-0
hover:bg-gray-50 cursor-pointer
transition-colors duration-100
```

Show: Airline name + icon/code, aircraft family, base ICAO, leg count, date (relative like "2 days ago").

### 3.6 Empty States

When no past schedules exist yet:
- Centered illustration or icon (a simple plane icon from Lucide)
- Heading: "No schedules yet"
- Subtitle: "Generate your first schedule using the form above"
- Muted colors: `text-gray-400` for icon, `text-gray-500` for text

### 3.7 Loading States

- **Button loading**: Replace label with a small spinner + "Generating..." text
- **Page/section loading**: Skeleton loaders matching the shape of content (gray animated bars)
- **Schedule generation**: The table area shows a skeleton table while the API call is in progress

### 3.8 Error States

- **Form validation errors**: Inline below the relevant field in red
- **Generation error (no routes)**: An alert banner above the table area:
  ```
  bg-yellow-50 border border-yellow-200 rounded-lg p-4
  text-yellow-800 text-sm
  ```
  With a warning icon and the error message.

---

## 4. Layout

### 4.1 Navigation

**Authenticated (dashboard)**: Simple top nav bar:
```
bg-white border-b border-gray-200
h-16
px-6
flex items-center justify-between
```

Left: CrewBoard logo/wordmark
Right: User email/name + logout button (ghost style)

**Public (landing, login, register)**: Same nav bar but with Login/Register buttons on the right.

### 4.2 Dashboard Layout

Single column, centered:
```
max-w-4xl mx-auto
px-4 sm:px-6
py-8
space-y-8
```

Order:
1. Page title: "Dashboard" or "Generate Schedule"
2. Schedule Generator card (form)
3. Generated schedule result (appears after generation, within same card or new card below)
4. Past Schedules card (list)

### 4.3 Responsive Behaviour

- **Mobile (< 640px)**: Full-width cards, stacked form fields, horizontal-scrollable table
- **Tablet (640px–1024px)**: Some form fields side-by-side (2-column grid)
- **Desktop (> 1024px)**: Comfortable max-width, all form fields visible

The schedule table should be horizontally scrollable on small screens (`overflow-x-auto`).

---

## 5. Third-Party Packages

### Required
| Package | Purpose |
|---------|---------|
| `next` | Framework |
| `react`, `react-dom` | UI |
| `tailwindcss`, `postcss`, `autoprefixer` | Styling |
| `next-auth@5` | Authentication |
| `prisma`, `@prisma/client` | Database ORM |
| `bcryptjs` | Password hashing |
| `@types/bcryptjs` | TypeScript types |

### Recommended
| Package | Purpose |
|---------|---------|
| `lucide-react` | Icons — clean, consistent, MIT-licensed. Use for navigation, buttons, status indicators, empty states. Key icons: `Plane`, `ArrowRight`, `ArrowLeft`, `Clock`, `Calendar`, `Trash2`, `Plus`, `LogOut`, `ChevronDown`, `AlertTriangle`, `Loader2` |
| `clsx` | Conditional class name joining — cleaner than template literals for Tailwind classes |
| `date-fns` | Date formatting for "2 days ago" relative times and schedule dates |

### Do NOT Include
- No component libraries (shadcn/ui, Radix, Headless UI) — keep it simple with hand-built components for MVP
- No animation libraries — CSS transitions are sufficient
- No state management libraries — React state + server components are enough
- No form libraries (react-hook-form, formik) — native forms with server actions or simple `useState` is fine for the few forms in this app

---

## 6. Iconography

Use **Lucide React** throughout. Keep icons at consistent sizes:
- Navigation / buttons: `size={18}` or `w-4.5 h-4.5`
- Inline with text: `size={16}` or `w-4 h-4`
- Empty states / feature highlights: `size={40}` or `w-10 h-10`
- Always use `stroke-width={1.5}` (Lucide default) for a clean look

Color icons to match their context text color. Don't use colored icons as decoration.

---

## 7. Logo & Branding

### Wordmark
"CrewBoard" as text in **Inter Bold (700)**, `text-gray-900`. The "Crew" portion in regular weight, "Board" in bold — or the full word in bold. Keep it simple.

For a brand mark/icon, use a stylised plane icon or a grid/board motif. For MVP, the text wordmark alone is sufficient.

### Favicon
Use a simple geometric mark — a small plane silhouette or the letter "C" in a rounded square with brand-500 background. Generate as 32x32 and 16x16 `.ico` plus a 180x180 `apple-touch-icon.png`.

---

## 8. Key UI Interactions

### Schedule Generation Flow
1. User fills form → clicks "Generate Schedule"
2. Button enters loading state (spinner + "Generating...")
3. Table area shows skeleton loader
4. On success: schedule table fades in, "Save" and "Regenerate" buttons appear
5. On error: yellow alert banner appears with error message
6. Saving: schedule auto-saves on generation (no separate save step) — just confirm with a brief toast or inline "Saved" indicator

### Schedule Regeneration
1. User clicks "Regenerate" (secondary button)
2. Same loading flow as above
3. Previous schedule table is replaced with new results
4. New schedule is saved as a separate entry (old one remains in history)

### Delete Confirmation
1. User clicks delete (trash icon or "Delete" button)
2. Inline confirmation appears: "Delete this schedule?" with "Cancel" and "Delete" buttons
3. No modal — keep it lightweight with an inline confirmation pattern

---

## 9. Aviation Flavour (Subtle)

A few touches to give the app an aviation identity without overdoing it:

- **ICAO codes in monospace**: Airport and aircraft codes always in `font-mono` — this is how they appear on real flight planning tools
- **Flight number formatting**: "LH100" style, monospace
- **Duration format**: Show as "1h 05m" not "65 minutes"
- **Direction arrows**: Use `→` for outbound, `←` for return legs in the schedule table
- **Schedule header**: Show the base airport prominently, e.g. "Schedule from EDDF" with the airline name
- **Table column headers**: Use aviation-adjacent terms: "Flight", "From", "To", "Type", "Block Time" (not "Duration")

Avoid: cockpit textures, instrument fonts, radar screen aesthetics, excessive use of green-on-black.
