# Website-UI Medusa Integration

## 1. Overview

Website-UI will integrate with Medusa backend using the Store API (public API) to fetch products, categories, and other data. No admin API keys will be exposed to the client.

---

## 2. API Strategy

### Store API vs Admin API

| Feature | Store API | Admin API |
|---------|-----------|-----------|
| Products (read) | ✅ Public | ✅ |
| Products (write) | ❌ | ✅ |
| Categories | ✅ Public | ✅ |
| Collections | ✅ Public | ✅ |
| Orders | ❌ | ✅ |
| Cart | ✅ Public | ✅ |
| Customers | ✅ Public | ✅ |

### Recommended Approach
- Use **Store API** for all public data fetching
- Create Next.js Route Handlers as API proxy if needed for CORS or custom logic
- Never expose admin API keys to client-side code

---

## 3. Medusa Store API

### Base URL
```
http://localhost:9000/store
```

### Authentication
- Store API is public by default
- Optional: Add API key for rate limiting

### Common Endpoints

#### Products
```
GET /store/products
GET /store/products/:id
GET /store/products/:handle
```

#### Categories
```
GET /store/product-categories
GET /store/product-categories/:id
```

#### Collections
```
GET /store/collections
GET /store/collections/:id
```

#### Cart
```
POST /store/carts
GET /store/carts/:id
POST /store/carts/:id/line-items
DELETE /store/carts/:id/line-items/:line_id
```

---

## 4. Service Implementation

### File Structure
```
apps/website-ui/
├── lib/
│   ├── medusa/
│   │   ├── client.ts          # Fetch wrapper
│   │   ├── types.ts           # TypeScript types
│   │   ├── products.ts        # Product queries
│   │   ├── categories.ts      # Category queries
│   │   └── cart.ts            # Cart operations
│   └── media.ts               # Image URL resolution
├── components/
│   └── products/
│       └── ...
└── app/
    └── ...
```

### Medusa Client
```typescript
// lib/medusa/client.ts
const MEDUSA_URL = process.env.NEXT_PUBLIC_MEDUSA_URL || "http://localhost:9000";

export async function medusaRequest<T>(
  endpoint: string,
  options?: RequestInit
): Promise<{ data: T; error?: string }> {
  try {
    const response = await fetch(`${MEDUSA_URL}/store${endpoint}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
      next: { revalidate: 3600 }, // Cache for 1 hour by default
    });

    if (!response.ok) {
      const error = await response.json();
      return { data: null as T, error: error.message || "Request failed" };
    }

    const data = await response.json();
    return { data };
  } catch (error) {
    return {
      data: null as T,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
```

### Product Types
```typescript
// lib/medusa/types.ts
export interface MedusaProduct {
  id: string;
  title: string;
  handle: string;
  description?: string;
  thumbnail?: string;
  images?: { id: string; url: string }[];
  variants?: MedusaVariant[];
  categories?: MedusaCategory[];
  metadata?: Record<string, unknown>;
  status?: "published" | "draft" | "proposed" | "rejected";
  created_at?: string;
  updated_at?: string;
}

export interface MedusaVariant {
  id: string;
  title: string;
  sku?: string;
  prices?: { amount: number; currency_code: string }[];
  inventory_quantity?: number;
  manage_inventory?: boolean;
}

export interface MedusaCategory {
  id: string;
  name: string;
  handle: string;
  description?: string;
  parent_category_id?: string;
  category_children?: MedusaCategory[];
}
```

### Product Queries
```typescript
// lib/medusa/products.ts
import { medusaRequest } from "./client";
import type { MedusaProduct } from "./types";

interface ProductsResponse {
  products: MedusaProduct[];
  count: number;
  offset: number;
  limit: number;
}

export async function getProducts(params?: {
  limit?: number;
  offset?: number;
  q?: string;
  category_id?: string;
  collection_id?: string;
  status?: string[];
}): Promise<{ data: ProductsResponse; error?: string }> {
  const searchParams = new URLSearchParams();
  
  if (params?.limit) searchParams.set("limit", String(params.limit));
  if (params?.offset) searchParams.set("offset", String(params.offset));
  if (params?.q) searchParams.set("q", params.q);
  if (params?.category_id) searchParams.set("category_id", params.category_id);
  if (params?.collection_id) searchParams.set("collection_id", params.collection_id);
  if (params?.status) searchParams.set("status", params.status.join(","));
  
  // Expand relations
  searchParams.set("expand", "variants,images,categories");
  
  return medusaRequest<ProductsResponse>(`/products?${searchParams}`);
}

export async function getProductByHandle(handle: string): Promise<{ data: MedusaProduct; error?: string }> {
  return medusaRequest<MedusaProduct>(`/products/${handle}?expand=variants,images,categories`);
}
```

### Category Queries
```typescript
// lib/medusa/categories.ts
import { medusaRequest } from "./client";
import type { MedusaCategory } from "./types";

export async function getCategories(params?: {
  parent_category_id?: string;
}): Promise<{ data: MedusaCategory[]; error?: string }> {
  const searchParams = new URLSearchParams();
  searchParams.set("limit", "100");
  
  if (params?.parent_category_id) {
    searchParams.set("parent_category_id", params.parent_category_id);
  }
  
  return medusaRequest<{ product_categories: MedusaCategory[] }>(
    `/product-categories?${searchParams}`
  );
}
```

---

## 5. React Query Integration

### Provider Setup
```tsx
// app/providers.tsx
"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            gcTime: 5 * 60 * 1000, // 5 minutes
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
```

### Hook Example
```typescript
// hooks/use-products.ts
import { useQuery } from "@tanstack/react-query";
import { getProducts } from "@/lib/medusa/products";

export function useProducts(params?: {
  limit?: number;
  q?: string;
  category_id?: string;
}) {
  return useQuery({
    queryKey: ["products", params],
    queryFn: () => getProducts(params),
    select: (data) => data.data?.products ?? [],
  });
}
```

---

## 6. Server Components

### Static Generation (SSG)
```tsx
// app/products/page.tsx
import { getProducts } from "@/lib/medusa/products";
import { ProductGrid } from "@/components/products/product-grid";

export const revalidate = 3600; // Revalidate every hour

export default async function ProductsPage() {
  const { data } = await getProducts({ limit: 50 });
  
  return (
    <main>
      <h1>Sản phẩm</h1>
      <ProductGrid products={data?.products ?? []} />
    </main>
  );
}
```

### Dynamic Route (SSR)
```tsx
// app/products/[handle]/page.tsx
import { getProductByHandle } from "@/lib/medusa/products";
import { notFound } from "next/navigation";

interface Props {
  params: Promise<{ handle: string }>;
}

export default async function ProductPage({ params }: Props) {
  const { handle } = await params;
  const { data: product, error } = await getProductByHandle(handle);
  
  if (error || !product) {
    notFound();
  }
  
  return (
    <main>
      <h1>{product.title}</h1>
      {/* Product details */}
    </main>
  );
}
```

---

## 7. Environment Configuration

### Required Variables
```env
# .env.local for website-ui
NEXT_PUBLIC_MEDUSA_URL=http://localhost:9000
```

### Optional Variables
```env
# For production
NEXT_PUBLIC_SITE_URL=https://mytholaptop.vn
NEXT_PUBLIC_MEDIA_BASE_URL=https://mytholaptop.vn
```

---

## 8. Error Handling

### Error States
```typescript
interface ApiResponse<T> {
  data: T | null;
  error?: string;
}

// Usage
const { data, error, isLoading } = useProducts();

if (isLoading) return <Skeleton />;
if (error) return <ErrorMessage message={error} />;
if (!data) return <EmptyState />;
```

### Retry Logic
```typescript
// React Query config
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
});
```

---

## 9. Caching Strategy

### ISR (Incremental Static Regeneration)
```typescript
// Revalidate every hour
export const revalidate = 3600;

// Revalidate on-demand with tags
export default async function Page() {
  const data = await fetch(url, { next: { tags: ["products"] } });
  return <ProductGrid products={data} />;
}
```

### Client-Side Caching
```typescript
// React Query caching
const { data } = useQuery({
  queryKey: ["product", handle],
  queryFn: () => getProductByHandle(handle),
  staleTime: 60 * 1000, // 1 minute
  gcTime: 10 * 60 * 1000, // 10 minutes
});
```

---

## 10. Data Transformation

### Medusa → Website Product
```typescript
// lib/medusa/transform.ts
export interface WebsiteProduct {
  id: string;
  title: string;
  handle: string;
  description: string;
  thumbnail: string;
  images: string[];
  price: number;
  originalPrice?: number;
  currency: string;
  sku?: string;
  stock: number;
  category: string;
  categoryId: string;
  status: "published" | "draft";
  tags: string[];
}

export function transformProduct(medusa: MedusaProduct): WebsiteProduct {
  const variant = medusa.variants?.[0];
  const price = variant?.prices?.[0];
  
  return {
    id: medusa.id,
    title: medusa.title,
    handle: medusa.handle,
    description: medusa.description ?? "",
    thumbnail: medusa.thumbnail ?? "/placeholder.jpg",
    images: medusa.images?.map((img) => img.url) ?? [],
    price: (price?.amount ?? 0) / 100, // Convert from cents
    currency: price?.currency_code ?? "vnd",
    sku: variant?.sku,
    stock: variant?.inventory_quantity ?? 0,
    category: medusa.categories?.[0]?.name ?? "",
    categoryId: medusa.categories?.[0]?.id ?? "",
    status: medusa.status ?? "draft",
    tags: [],
  };
}
```

---

## 11. Implementation Checklist

- [ ] Create `lib/medusa/` directory
- [ ] Implement Medusa client wrapper
- [ ] Define TypeScript types
- [ ] Create product query functions
- [ ] Create category query functions
- [ ] Add React Query provider
- [ ] Create custom hooks
- [ ] Add error handling
- [ ] Add environment variables
- [ ] Test API integration
- [ ] Add data transformation layer
- [ ] Implement caching strategy
