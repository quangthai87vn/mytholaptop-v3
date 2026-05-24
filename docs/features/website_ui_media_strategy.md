# Media Strategy - Shared Image Storage for Admin-UI and Website-UI

## 1. Current State

### Admin-UI Media Storage
- **Location**: `apps/admin-ui/public/wp-content/uploads/`
- **Structure**: `wp-content/uploads/YYYY/MM/filename.ext`
- **Usage**: Migration downloads images from WooCommerce and saves locally
- **Database**: Stores relative path like `/wp-content/uploads/2026/05/image.webp`

### Problem
- Admin-UI `public/` folder is not accessible from Website-UI
- Two Next.js apps can't share files from each other's `public/` folders
- Images won't display on website if stored only in admin-ui

---

## 2. Solution: Shared Media Folder

### Option A: Root-Level Shared Folder (RECOMMENDED)
```
d:\AI PROJECT\mytholaptop-v3/
├── apps/
│   ├── admin-ui/
│   ├── backend-ui/
│   └── website-ui/
├── public/                     # NEW: Shared public folder
│   └── wp-content/
│       └── uploads/
│           ├── 2026/
│           └── ...
├── apps/admin-ui/public/     # Keep as symlink or empty
└── apps/website-ui/public/    # Keep as symlink or empty
```

**Pros**:
- Both apps can serve from `/wp-content/uploads/`
- Works with Next.js `public/` folder
- No symlinks needed if both apps reference same path

**Cons**:
- Need to configure both apps to use shared public folder

### Option B: Copy on Build (NOT RECOMMENDED)
- Copy images from admin-ui to website-ui on build
- Increases build time
- Duplicates files
- Hard to sync updates

### Option C: Nginx/CDN Serving (FOR PRODUCTION)
- Serve images from CDN or Nginx
- Both apps use same CDN URL
- Best for production scale

---

## 3. Recommended Implementation

### Step 1: Create Shared Public Folder
```
d:\AI PROJECT\mytholaptop-v3\public\wp-content\uploads\
```

### Step 2: Symlink or Configure Admin-UI
Option A: Create symlink
```bash
# In admin-ui folder (on Windows)
mklink /D public\wp-content ..\..\public\wp-content
```

Option B: Configure upload path in migration service (RECOMMENDED)
- Update `image-migration.v2.ts` to save to `../../public/wp-content/uploads/`
- Keep relative path format: `/wp-content/uploads/YYYY/MM/filename.ext`

### Step 3: Configure Website-UI
```typescript
// next.config.ts
const nextConfig = {
  images: {
    unoptimized: true,
    remotePatterns: [
      // Local shared media
      { protocol: "http", hostname: "localhost" },
    ],
  },
  // Allow serving static files from root public
  servedStatic: {
    path: "/wp-content/uploads",
    dest: "../../public/wp-content/uploads",
  },
};
```

### Step 4: Use Relative Paths in Code
```typescript
// Both apps use same path format
const imagePath = "/wp-content/uploads/2026/05/image.webp";

// In components
<Image src={product.thumbnail} alt={product.title} />
// Renders as: /wp-content/uploads/2026/05/image.webp
```

---

## 4. Image Path Standards

### Database Storage Format
```
/wp-content/uploads/YYYY/MM/filename.ext
```

### Examples
```
/wp-content/uploads/2026/05/z7796329845939_73a5803408716c322b1c2bcad29a9552.jpg
/wp-content/uploads/2024/11/laptop-hp-elitebook-840-g8.jpg
/wp-content/uploads/2025/03/macbook-pro-m3-14-inch.jpg
```

### NOT
```
❌ /uploads/2026/05/image.jpg
❌ https://admin-ui:3000/wp-content/uploads/2026/05/image.jpg
❌ C:\path\to\admin-ui\public\wp-content\uploads\2026\05\image.jpg
```

---

## 5. Next.js Static File Serving

### How Next.js Serves Static Files
```
public/ folder content is served from root URL
public/wp-content/uploads/image.jpg → /wp-content/uploads/image.jpg
```

### Website-UI Configuration
```typescript
// apps/website-ui/next.config.ts
import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "picsum.photos" },
      // Add Medusa S3 buckets
      { protocol: "https", hostname: "**.s3.amazonaws.com" },
    ],
  },
  // For local development, images will be served via absolute path
  // In production, use CDN or shared storage
};

export default nextConfig;
```

### Absolute URL for Local Development
During local development, website-ui needs to know where admin-ui is running:
```typescript
// lib/media.ts
const ADMIN_UI_URL = process.env.NEXT_PUBLIC_ADMIN_UI_URL || "http://localhost:3000";

export function getMediaUrl(relativePath: string): string {
  if (!relativePath) return "/placeholder.jpg";
  
  // Already absolute URL
  if (relativePath.startsWith("http")) return relativePath;
  
  // Local path - need full URL for website-ui
  return `${ADMIN_UI_URL}${relativePath}`;
}
```

### Better Solution: Shared Server
For production, serve media from same domain:
```
https://mytholaptop.vn/wp-content/uploads/2026/05/image.jpg
```

Configure in `.env`:
```env
NEXT_PUBLIC_MEDIA_BASE_URL=https://mytholaptop.vn
```

---

## 6. Migration Service Update

### Current Upload Path
```typescript
// image-migration.v2.ts
uploadRootDir: "public/wp-content/uploads"
uploadPublicPath: "/wp-content/uploads"
```

### Recommended Update
Create a shared config:
```typescript
// apps/admin-ui/lib/media-config.ts
export const MEDIA_CONFIG = {
  uploadRootDir: path.join(process.cwd(), "..", "..", "public", "wp-content", "uploads"),
  uploadPublicPath: "/wp-content/uploads",
  baseUrl: process.env.NEXT_PUBLIC_MEDIA_BASE_URL || "",
};
```

Or keep current structure and use symlink:
```bash
# In admin-ui directory
rm -rf public/wp-content
ln -s ../../public/wp-content public/wp-content
```

---

## 7. Image Rendering Best Practices

### In Components
```tsx
// Good: Use next/image with proper sizing
<Image
  src={product.thumbnail}
  alt={product.title}
  fill
  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
  className="object-cover"
/>

// For unoptimized images (local files)
<Image
  src={getMediaUrl(product.thumbnail)}
  alt={product.title}
  width={400}
  height={300}
  unoptimized
/>
```

### Lazy Loading
```tsx
// Most images - lazy load by default
<Image src={thumbnail} alt={title} />

// Above-the-fold images - eager load
<Image src={hero} alt="Banner" priority />

// Product thumbnails in grid - lazy but with blur placeholder
<Image src={thumbnail} alt={title} placeholder="blur" />
```

---

## 8. Image Formats Support

### Current Support
- `.jpg`, `.jpeg` - Common
- `.png` - With transparency
- `.webp` - Modern format (preferred)
- `.gif` - Animated (if needed)

### Recommendations
- Convert to WebP during migration if possible
- Use responsive images with `srcset`
- Consider CDN for image optimization

---

## 9. Implementation Checklist

- [ ] Create `d:\AI PROJECT\mytholaptop-v3\public\wp-content\uploads\` folder
- [ ] Update admin-ui migration service to save to shared folder
- [ ] Add symlink in admin-ui: `public/wp-content` → `../../public/wp-content`
- [ ] Add symlink in website-ui: `public/wp-content` → `../../public/wp-content`
- [ ] Update website-ui `next.config.ts` with proper image patterns
- [ ] Create `lib/media.ts` helper for URL resolution
- [ ] Test image loading in both apps
- [ ] Configure production media URL in environment

---

## 10. Production Deployment

### Option 1: Same Server
Serve from `https://mytholaptop.vn/wp-content/uploads/`
Configure Nginx to serve static files from shared location

### Option 2: CDN
Upload images to S3/CloudFlare R2
Configure CDN URL in `NEXT_PUBLIC_MEDIA_BASE_URL`

### Option 3: Medusa Built-in
Use Medusa's file service (S3, GCS, etc.)
Configure as primary storage
Both apps use Medusa's image URLs

---

## 11. Summary

| Aspect | Current | Recommended |
|--------|---------|-------------|
| Storage | `admin-ui/public/` | `root/public/` |
| Path in DB | Relative `/wp-content/...` | Same |
| URL Resolution | Admin-ui only | Both apps via shared folder |
| Production | Needs CDN/Server config | CDN recommended |

### Key Points
1. Database stores relative path only: `/wp-content/uploads/YYYY/MM/file.jpg`
2. Create shared root `public/` folder
3. Both apps symlink or configure to use shared folder
4. Use environment variable for base URL in production
5. Never store absolute URLs in database
