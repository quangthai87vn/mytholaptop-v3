# Prompt Cursor: Theme Settings với 10 Themes và Gradient

```md
Upgrade Settings → Giao diện tab with 10 theme presets, including gradient themes, dark mode, and default collapsed sidebar.

Context:
- Project: mytholaptop-v3
- App: apps/admin-ui
- Do NOT modify apps/backend-ui.
- Page: `/settings`
- Use shadcn/ui + Tailwind CSS.
- Main brand direction is still red-based for Mỹ Tho Laptop.

TASK:
Build a professional Theme Settings system with solid and gradient themes.

Theme presets:

1. MTL Classic Red
- primary: #E60012
- background: #FFFFFF
- sidebar: #FFFFFF
- gradient: none

2. MTL Modern Red
- primary: #DC2626
- background: #F8FAFC
- sidebar: #FFFFFF
- gradient: none

3. MTL Deep Red
- primary: #B91C1C
- background: #F9FAFB
- sidebar: #FFF5F5
- gradient: none

4. MTL Red Black
- primary: #EF4444
- background: #FAFAFA
- sidebar: #111827
- sidebar text: #FFFFFF
- gradient: none

5. MTL Soft Red Gradient
- primary: #F43F5E
- background: #FFF7F7
- sidebar: #FFFFFF
- gradient: linear-gradient(135deg, #E60012, #FF6B6B)

6. MTL Premium Dark Gradient
- primary: #EF4444
- background: #0F172A
- sidebar: #020617
- text: #F8FAFC
- gradient: linear-gradient(135deg, #7F1D1D, #EF4444, #111827)

7. MTL Tech Red Gradient
- primary: #FF0033
- background: #F8FAFC
- sidebar: #0B1120
- sidebar text: #FFFFFF
- gradient: linear-gradient(135deg, #FF0033, #7C3AED)

8. MTL Sunset Red Gradient
- primary: #F97316
- background: #FFF7ED
- sidebar: #FFFFFF
- gradient: linear-gradient(135deg, #E60012, #F97316, #FACC15)

9. MTL Ruby Gradient
- primary: #E11D48
- background: #FFFFFF
- sidebar: #FFF1F2
- gradient: linear-gradient(135deg, #BE123C, #E11D48, #FB7185)

10. MTL Black Ruby Gradient
- primary: #EF4444
- background: #09090B
- sidebar: #18181B
- text: #FAFAFA
- sidebar text: #FAFAFA
- gradient: linear-gradient(135deg, #18181B, #991B1B, #EF4444)

Requirements:

1. Settings UI
In `/settings` → tab “Giao diện”:
- Replace simple color input with theme preset cards.
- Each theme card must show:
  - Theme name
  - Color swatches
  - Gradient preview strip if theme has gradient
  - Short description
  - Selected badge/check icon
- User can click a theme card to select.
- Save button persists selected theme.

2. Gradient support
Theme object should support:

```ts
type AdminTheme = {
  id: string
  name: string
  description: string
  primary: string
  background: string
  sidebar: string
  text?: string
  sidebarText?: string
  gradient?: string
}
```

3. Apply selected theme globally
Use CSS variables:
- --primary
- --primary-foreground
- --background
- --foreground
- --sidebar
- --sidebar-foreground
- --theme-gradient

Apply gradient to suitable UI areas:
- primary buttons can use gradient when available
- active menu item can use gradient when available
- selected theme card preview
- do NOT overuse gradient on the whole app background unless theme is dark/premium

4. Persist UI settings
Use localStorage key:
- `mtl-ui-settings`

Structure:

```ts
type UISettings = {
  themeId: string
  darkMode: boolean
  sidebarCollapsedDefault: boolean
}
```

Default:

```ts
{
  themeId: "mtl-classic-red",
  darkMode: false,
  sidebarCollapsedDefault: false
}
```

5. Dark Mode
When enabled:
- Add `dark` class to document root.
- Persist setting.
- UI remains readable.
- Dark mode must work with gradient themes.

6. Sidebar collapsed by default
When enabled:
- Persist setting.
- On reload, sidebar starts collapsed.
- Existing collapse/expand button still works.
- Do not break mobile sidebar.

7. Live preview
Preferred:
- When clicking a theme card, preview immediately.
- Save button persists.

8. Create/update files
Create:
- `lib/themes.ts`
- `hooks/use-ui-settings.ts`

Update:
- `/settings` page
- layout/sidebar/header components if they use hardcoded red
- global CSS if needed

9. QA
Test:
- Select each of 10 themes
- Gradient preview displays correctly
- Gradient buttons/active menu work
- Save and refresh persists theme
- Dark Mode persists
- Sidebar collapsed default persists
- Mobile sidebar works
- No TypeScript errors
- apps/backend-ui was not modified

After finishing:
- List changed files
- Explain how solid and gradient themes are applied
- Show final 10 theme names
```
