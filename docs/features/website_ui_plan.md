# Website UI Plan - Mỹ Tho Laptop Ecommerce Storefront

## 1. Overview

### Project Goal
Build a modern, fast, mobile-first ecommerce website for Mỹ Tho Laptop - a Vietnamese laptop retailer.

### Target Users
- Vietnamese customers looking to buy laptops
- Users browsing products on mobile and desktop
- Customers comparing products, checking prices, and stock availability

### Key Requirements
- Fast loading (Core Web Vitals)
- Mobile-first responsive design
- SEO optimized
- Product-focused UI
- Integration with Medusa backend via API

---

## 2. Project Structure

### Monorepo Location
```
d:\AI PROJECT\mytholaptop-v3/
├── apps/
│   ├── admin-ui/       # Internal admin dashboard
│   ├── backend-ui/     # Medusa backend
│   └── website-ui/     # Public ecommerce storefront (NEW)
├── docs/features/      # Documentation
├── node_modules/       # Shared dependencies
├── package.json        # Root workspace config
├── pnpm-workspace.yaml # pnpm workspace config
└── turbo.json         # Turborepo config
```

### Package Manager
- **pnpm** v9.15.0 (specified in packageManager)
- Turborepo for build orchestration

### Tech Stack
- Next.js 16 (App Router)
- TypeScript 5.7
- React 19
- Tailwind CSS 4.x
- shadcn/ui components
- next/image for optimization

---

## 3. Page Structure

### Main Pages

| Page | Route | Description |
|------|-------|-------------|
| Home | `/` | Hero banner, featured products, categories |
| Products | `/products` | Full product listing with filters |
| Product Detail | `/products/[handle]` | Single product page |
| Category | `/categories/[handle]` | Products filtered by category |
| Search | `/search?q=...` | Search results page |
| Cart | `/cart` | Shopping cart (when Medusa cart ready) |
| Contact | `/contact` | Store info and contact form |

### Page Priority
1. **Phase 1**: Home, Products, Product Detail
2. **Phase 2**: Category, Search, Contact
3. **Phase 3**: Cart, Checkout (Medusa integration)

---

## 4. Component Architecture

### Layout Components
```
components/
├── layout/
│   ├── header.tsx          # Main header with nav
│   ├── mobile-menu.tsx     # Mobile navigation drawer
│   ├── footer.tsx          # Site footer
│   └── layout-client.tsx   # Client wrapper for state
├── home/
│   ├── hero-banner.tsx     # Homepage hero
│   ├── category-grid.tsx   # Category cards
│   └── featured-products.tsx # Featured products section
├── products/
│   ├── product-grid.tsx    # Responsive product grid
│   ├── product-card.tsx    # Individual product card
│   ├── product-filters.tsx # Filter sidebar/drawer
│   └── product-detail.tsx  # Product detail page
├── ui/                     # shadcn/ui components
└── cart/                   # Cart components (future)
```

### Shared Components
- `ui/button.tsx` - Custom styled buttons
- `ui/badge.tsx` - Status badges
- `ui/card.tsx` - Card containers
- `ui/input.tsx` - Form inputs
- `product-card.tsx` - Reusable product display

---

## 5. Data Flow

### Product Fetching
```
website-ui -> Medusa API (admin or store API)
         -> Cached responses
         -> Server Components (SSG/ISR where possible)
         -> Client Components (filters, cart)
```

### API Integration
- Storefront API: `/store/products` (public)
- No admin API keys exposed to client
- Use Next.js Route Handlers as proxy if needed

### Caching Strategy
- Static generation for category pages (revalidate: 3600)
- Server-side rendering for search
- Client-side for filters and cart

---

## 6. Routing Strategy

### File-based Routing (App Router)
```
app/
├── layout.tsx              # Root layout with header/footer
├── page.tsx               # Home page
├── products/
│   ├── page.tsx           # Product listing
│   └── [handle]/
│       └── page.tsx       # Product detail
├── categories/
│   └── [handle]/
│       └── page.tsx       # Category page
├── search/
│   └── page.tsx           # Search results
├── cart/
│   └── page.tsx           # Cart page
└── contact/
    └── page.tsx           # Contact page
```

---

## 7. Performance Targets

| Metric | Target |
|--------|--------|
| LCP | < 2.5s |
| FID | < 100ms |
| CLS | < 0.1 |
| Bundle Size | < 150KB (initial JS) |
| Image Loading | next/image with lazy loading |

### Optimization Techniques
- Server Components by default
- Dynamic imports for heavy components
- Image optimization with next/image
- Font optimization with next/font
- Route prefetching

---

## 8. Dependencies

### Required Packages
```json
{
  "dependencies": {
    "next": "^16.2.4",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "lucide-react": "^0.468.0",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "tailwind-merge": "^2.6.0",
    "@radix-ui/react-dialog": "^1.1.4",
    "@radix-ui/react-dropdown-menu": "^2.1.4",
    "@radix-ui/react-select": "^2.1.4",
    "@radix-ui/react-tabs": "^1.1.4",
    "sonner": "^1.7.1",
    "@tanstack/react-query": "^5.100.6"
  }
}
```

---

## 9. Environment Variables

### Required
```env
NEXT_PUBLIC_MEDUSA_URL=http://localhost:9000
NEXT_PUBLIC_MEDUSA_STORE_API_KEY=optional_store_key
```

### Optional
```env
NEXT_PUBLIC_SITE_URL=http://localhost:3001
```

---

## 10. Development Workflow

### Scripts
```bash
pnpm dev:website      # Start website-ui dev server
pnpm build:website    # Build website-ui
pnpm dev              # Start all apps (monorepo)
```

### Ports
- admin-ui: 3000
- backend-ui: 9000
- website-ui: 3001

---

## 11. Constraints

### DO NOT
- Connect directly to PostgreSQL from website-ui
- Expose admin API keys
- Modify backend-ui or admin-ui core logic
- Hardcode products or categories
- Break existing admin-ui functionality

### DO
- Keep website-ui independent
- Use Medusa Store API (public)
- Follow existing design patterns
- Maintain responsive mobile-first approach
- Add shadcn/ui components as needed

---

## 12. Implementation Phases

### Phase 1: Foundation
- [x] Setup website-ui project
- [ ] Create layout components
- [ ] Setup Medusa client/service
- [ ] Build product fetching utilities

### Phase 2: Core Pages
- [ ] Home page with hero and products
- [ ] Product listing page
- [ ] Product detail page
- [ ] Product card component

### Phase 3: Additional Pages
- [ ] Category pages
- [ ] Search functionality
- [ ] Contact page

### Phase 4: Advanced Features
- [ ] Cart integration
- [ ] Wishlist
- [ ] User authentication
- [ ] Checkout flow
