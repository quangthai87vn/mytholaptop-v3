# Website UI Design System - Mỹ Tho Laptop

## 1. Design Philosophy

### Core Principles
- **Clean & Modern**: Minimal clutter, clear hierarchy
- **Product-Focused**: Products are the heroes, not the UI
- **Fast & Responsive**: Mobile-first approach
- **Trust-Building**: Professional Vietnamese ecommerce aesthetic
- **Brand-Aligned**: Red primary color matching admin UI

### Vietnamese Ecommerce Inspiration
Inspired by modern Vietnamese ecommerce sites like:
- Nguyễn Kim, FPT Shop, CellphoneS
- Tiki, Shopee (simplified for B2B feel)
- Clean layouts with clear pricing
- Prominent stock status and specifications

---

## 2. Color Palette

### Primary Colors
```css
--color-primary: #DC2626;        /* Bright red - brand color */
--color-primary-dark: #B91C1C;   /* Hover state */
--color-primary-light: #FEE2E2;  /* Background tint */
--color-primary-foreground: #FFFFFF; /* Text on primary */
```

### Secondary Colors
```css
--color-secondary: #1F2937;      /* Dark gray */
--color-secondary-dark: #111827;  /* Darker hover */
--color-secondary-light: #F3F4F6; /* Light background */
```

### Neutral Colors
```css
--color-background: #FFFFFF;    /* Page background */
--color-background-alt: #F9FAFB; /* Section backgrounds */
--color-foreground: #111827;      /* Primary text */
--color-muted: #6B7280;          /* Secondary text */
--color-muted-light: #9CA3AF;    /* Tertiary text */
--color-border: #E5E7EB;         /* Borders */
--color-border-dark: #D1D5DB;    /* Stronger borders */
```

### Semantic Colors
```css
--color-success: #10B981;        /* In stock */
--color-success-light: #D1FAE5;  /* Success bg */
--color-warning: #F59E0B;        /* Low stock */
--color-warning-light: #FEF3C7;  /* Warning bg */
--color-error: #EF4444;          /* Out of stock */
--color-error-light: #FEE2E2;    /* Error bg */
--color-info: #3B82F6;           /* Information */
--color-info-light: #DBEAFE;     /* Info bg */
```

### Price Colors
```css
--color-price: #DC2626;          /* Sale price - red */
--color-price-original: #6B7280; /* Original price - gray */
--color-discount: #10B981;       /* Discount badge - green */
```

---

## 3. Typography

### Font Family
```css
--font-heading: 'Be Vietnam Pro', system-ui, sans-serif;
--font-body: 'Be Vietnam Pro', system-ui, sans-serif;
```

### Font Sizes
```css
--text-xs: 0.75rem;      /* 12px - labels, badges */
--text-sm: 0.875rem;     /* 14px - secondary text */
--text-base: 1rem;       /* 16px - body text */
--text-lg: 1.125rem;     /* 18px - large body */
--text-xl: 1.25rem;      /* 20px - section titles */
--text-2xl: 1.5rem;      /* 24px - card titles */
--text-3xl: 1.875rem;    /* 30px - page titles */
--text-4xl: 2.25rem;     /* 36px - hero titles */
--text-5xl: 3rem;        /* 48px - main hero */
```

### Font Weights
```css
--font-normal: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;
```

### Line Heights
```css
--leading-tight: 1.25;   /* Headings */
--leading-normal: 1.5;   /* Body text */
--leading-relaxed: 1.75;  /* Long text */
```

---

## 4. Spacing System

### Base Unit: 4px
```css
--spacing-1: 0.25rem;   /* 4px */
--spacing-2: 0.5rem;    /* 8px */
--spacing-3: 0.75rem;   /* 12px */
--spacing-4: 1rem;      /* 16px */
--spacing-5: 1.25rem;   /* 20px */
--spacing-6: 1.5rem;     /* 24px */
--spacing-8: 2rem;       /* 32px */
--spacing-10: 2.5rem;   /* 40px */
--spacing-12: 3rem;      /* 48px */
--spacing-16: 4rem;      /* 64px */
--spacing-20: 5rem;      /* 80px */
--spacing-24: 6rem;      /* 96px */
```

### Container Widths
```css
--container-sm: 640px;   /* Mobile large */
--container-md: 768px;   /* Tablet */
--container-lg: 1024px;  /* Desktop */
--container-xl: 1280px;  /* Desktop large */
--container-2xl: 1536px; /* Wide screens */
```

### Section Padding
```css
.section-padding-y: 4rem md:6rem lg:8rem
.section-padding-x: 1rem sm:1.5rem lg:2rem
```

---

## 5. Border Radius

```css
--radius-sm: 0.25rem;   /* 4px - buttons, inputs */
--radius-md: 0.5rem;    /* 8px - cards */
--radius-lg: 0.75rem;   /* 12px - modals */
--radius-xl: 1rem;      /* 16px - large cards */
--radius-full: 9999px;   /* Pills, avatars */
```

---

## 6. Shadows

```css
--shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
--shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
--shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1);
--shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1);
--shadow-card: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
--shadow-card-hover: 0 10px 20px -3px rgb(0 0 0 / 0.1);
```

---

## 7. Component Specifications

### 7.1 Buttons

#### Primary Button
```css
/* Default */
background: var(--color-primary);
color: white;
padding: 0.75rem 1.5rem;
border-radius: var(--radius-sm);
font-weight: 600;

/* Hover */
background: var(--color-primary-dark);

/* Active */
scale: 0.98;

/* Disabled */
opacity: 0.5;
cursor: not-allowed;
```

#### Secondary Button
```css
background: transparent;
border: 2px solid var(--color-primary);
color: var(--color-primary);

/* Hover */
background: var(--color-primary-light);
```

#### Ghost Button
```css
background: transparent;
color: var(--color-foreground);

/* Hover */
background: var(--color-secondary-light);
```

### 7.2 Product Card

```css
/* Container */
border-radius: var(--radius-lg);
border: 1px solid var(--color-border);
background: white;
transition: all 0.2s;

/* Hover */
box-shadow: var(--shadow-card-hover);
transform: translateY(-2px);

/* Image */
aspect-ratio: 4/3;
object-fit: cover;

/* Title */
font-size: var(--text-base);
font-weight: 600;
line-clamp: 2;

/* Price */
font-size: var(--text-xl);
font-weight: 700;
color: var(--color-primary);

/* Original Price */
font-size: var(--text-sm);
color: var(--color-muted);
text-decoration: line-through;

/* Stock Badge */
font-size: var(--text-xs);
font-weight: 500;
```

### 7.3 Header

```css
/* Desktop */
height: 64px;
background: white;
border-bottom: 1px solid var(--color-border);
position: sticky;
top: 0;
z-index: 50;

/* Logo */
height: 40px;
object-fit: contain;

/* Nav Links */
font-size: var(--text-sm);
font-weight: 500;
color: var(--color-foreground);
gap: 2rem;

/* Mobile */
hamburger menu visible;
slide-out drawer from left;
```

### 7.4 Footer

```css
background: var(--color-secondary);
color: white;
padding: var(--spacing-12) 0;

/* Links */
font-size: var(--text-sm);
color: var(--color-muted-light);
hover: color white;

/* Contact Info */
icon + text layout;
```

### 7.5 Input Fields

```css
height: 44px;
border: 1px solid var(--color-border);
border-radius: var(--radius-sm);
padding: 0 1rem;
font-size: var(--text-base);

/* Focus */
border-color: var(--color-primary);
box-shadow: 0 0 0 3px var(--color-primary-light);
outline: none;

/* Error */
border-color: var(--color-error);
```

### 7.6 Badges

```css
/* Stock Badge */
padding: 0.25rem 0.5rem;
font-size: var(--text-xs);
font-weight: 600;
border-radius: var(--radius-sm);

/* In Stock */
background: var(--color-success-light);
color: var(--color-success);

/* Low Stock */
background: var(--color-warning-light);
color: var(--color-warning);

/* Out of Stock */
background: var(--color-error-light);
color: var(--color-error);
```

---

## 8. Layout Specifications

### 8.1 Page Layout
```css
/* Container */
max-width: var(--container-xl);
margin: 0 auto;
padding-left: var(--spacing-4);
padding-right: var(--spacing-4);

@media (min-width: 768px) {
  padding-left: var(--spacing-6);
  padding-right: var(--spacing-6);
}
```

### 8.2 Product Grid

```css
/* Mobile */
grid-template-columns: repeat(2, 1fr);
gap: var(--spacing-3);

/* Tablet */
grid-template-columns: repeat(3, 1fr);
gap: var(--spacing-4);

/* Desktop */
grid-template-columns: repeat(4, 1fr);
gap: var(--spacing-5);

/* Wide */
@media (min-width: 1280px) {
  grid-template-columns: repeat(5, 1fr);
}
```

### 8.3 Hero Section

```css
height: 400px md:500px lg:600px;
background: linear-gradient(135deg, var(--color-primary) 0%, #991B1B 100%);
color: white;
display: flex;
align-items: center;
```

---

## 9. Responsive Breakpoints

```css
/* Mobile: < 640px */
--screen-sm: 640px;

/* Tablet: 640px - 768px */
--screen-md: 768px;

/* Desktop: 768px - 1024px */
--screen-lg: 1024px;

/* Desktop Large: 1024px - 1280px */
--screen-xl: 1280px;

/* Wide: > 1280px */
--screen-2xl: 1536px;
```

---

## 10. Animation Guidelines

### Transitions
```css
--transition-fast: 150ms ease;
--transition-normal: 200ms ease;
--transition-slow: 300ms ease;
```

### Hover Effects
```css
/* Cards */
transform: translateY(-2px);
box-shadow: var(--shadow-card-hover);

/* Buttons */
opacity: 0.9;
transform: scale(0.98);

/* Links */
color: var(--color-primary);
```

### Loading States
```css
/* Skeleton */
background: linear-gradient(
  90deg,
  var(--color-border) 25%,
  var(--color-background-alt) 50%,
  var(--color-border) 75%
);
background-size: 200% 100%;
animation: shimmer 1.5s infinite;
```

---

## 11. Accessibility

### Color Contrast
- Text on background: minimum 4.5:1
- Large text (18px+): minimum 3:1
- Interactive elements: minimum 3:1

### Focus States
```css
outline: 2px solid var(--color-primary);
outline-offset: 2px;
```

### Screen Reader
- Use semantic HTML
- Add aria-labels where needed
- Skip links for navigation
