# GT Collective CMS + Monorepo Design

**Date:** 2026-02-21
**Status:** Approved

## Overview

Multi-tenant CMS for GT Collective brand family (GT Collective, SurfaceLab, CorsaClub) with separate frontend deployments per brand. CMS on Cloudflare Workers, frontends on Vercel Hobby.

## Architecture

### Deployment Topology

```
                    ┌─────────────────────┐
                    │   Cloudflare Workers │
                    │                     │
                    │  Payload CMS (API)  │
                    │  D1 SQLite (DB)     │
                    │  R2 (Media/Files)   │
                    └────────┬────────────┘
                             │ REST API
                    ┌────────┼────────────┐
                    │        │            │
              ┌─────▼──┐ ┌──▼─────┐ ┌────▼───┐
              │ Vercel  │ │ Vercel │ │ Future │
              │         │ │        │ │        │
              │ Surface │ │  GT    │ │ Corsa  │
              │  Lab    │ │Collect.│ │  Club  │
              └─────────┘ └────────┘ └────────┘
              surfacelab   gtcollect   corsaclub
              .com.au      ive.au      .com.au
```

### Monorepo Structure

```
gt-collective-monorepo/
├── apps/
│   ├── cms/                        # Payload CMS → Cloudflare Workers
│   │   ├── src/
│   │   │   ├── access/             # Tenant-scoped access control functions
│   │   │   ├── blocks/             # Content block definitions (Hero, FAQ, CTA...)
│   │   │   ├── collections/        # All Payload collections
│   │   │   ├── globals/            # CompanyInfo, SEODefaults
│   │   │   ├── fields/             # Reusable fields (siteField, slugField)
│   │   │   ├── hooks/              # Lifecycle hooks (email, slug gen, etc.)
│   │   │   ├── migrations/         # D1 database migrations
│   │   │   ├── app/(payload)/      # Payload admin panel routes
│   │   │   └── payload.config.ts   # Main config
│   │   ├── wrangler.jsonc
│   │   └── package.json
│   │
│   ├── surfacelab/                 # SurfaceLab frontend → Vercel Hobby
│   │   ├── src/
│   │   │   ├── app/                # Next.js App Router pages
│   │   │   ├── components/         # Brand-specific components
│   │   │   └── lib/                # CMS client, utilities
│   │   ├── next.config.ts
│   │   └── package.json
│   │
│   └── gtcollective/              # GT Collective frontend → Vercel Hobby
│       ├── src/
│       │   ├── app/
│       │   ├── components/
│       │   └── lib/
│       ├── next.config.ts
│       └── package.json
│
├── packages/
│   ├── shared-ui/                 # Shared shadcn/ui components, design tokens
│   │   ├── src/components/ui/     # Button, Input, Accordion, Carousel, etc.
│   │   ├── src/hooks/             # useSmoothScroll, useParallax, useMobile
│   │   └── package.json
│   │
│   ├── cms-types/                 # Auto-generated Payload types
│   │   ├── src/payload-types.ts   # Generated from CMS schema
│   │   └── package.json
│   │
│   ├── cms-client/                # Typed API client for fetching CMS content
│   │   ├── src/
│   │   │   ├── client.ts          # Base fetch client with auth
│   │   │   ├── pages.ts           # getPage, getPages
│   │   │   ├── navigation.ts      # getNavigation
│   │   │   ├── globals.ts         # getCompanyInfo, getSEODefaults
│   │   │   └── media.ts           # getMediaUrl helper
│   │   └── package.json
│   │
│   └── email-templates/           # React Email templates
│       ├── src/
│       │   ├── CustomerConfirmation.tsx
│       │   └── CustomerSupportNotification.tsx
│       └── package.json
│
├── turbo.json                     # Turborepo pipeline config
├── pnpm-workspace.yaml            # Workspace definitions
└── package.json                   # Root scripts
```

### Data Flow

```
1. Editor creates/updates content in Payload admin (cms.gtcollective.au/admin)
2. Content stored in D1 SQLite, media in R2
3. Frontend pages use ISR (Incremental Static Regeneration):
   - fetch('https://cms.gtcollective.au/api/pages?where[slug][equals]=home&where[site][equals]=surfacelab')
   - Revalidate every 60 seconds (or on-demand via webhook)
4. next/image optimizes R2 images through Vercel's image pipeline
5. Form submissions POST to CMS API → stored in FormSubmissions collection → email via Resend
```

## CMS Content Model

### Collections

#### Pages
Primary content collection. Block-based page builder.
```
- title: text (required)
- slug: text (unique per site, auto-generated from title)
- site: select [gtcollective, surfacelab, corsaclub] (required, sidebar)
- blocks: blocks[] (the page builder - see Content Blocks below)
- seo:
  - metaTitle: text
  - metaDescription: textarea
  - ogImage: upload (media)
  - noIndex: checkbox
- status: draft/published (versions enabled)
```

#### Navigation
Per-brand navigation menus.
```
- site: select [gtcollective, surfacelab, corsaclub] (required)
- position: select [header, footer] (required)
- items: array
  - label: text (required)
  - type: select [internal, external, anchor]
  - page: relationship → Pages (if internal)
  - url: text (if external)
  - anchor: text (if anchor, e.g. #contact)
  - openInNewTab: checkbox
  - children: array (same shape, 1 level deep)
```

#### Brands
Brand definitions (not multi-tenant filtered).
```
- name: text (required)
- slug: text (unique)
- logo: upload (media)
- logoInverted: upload (media) (for dark backgrounds)
- domain: text (e.g. surfacelab.com.au)
- primaryColor: text (hex)
- description: textarea
```

#### FormSubmissions
Contact form entries viewable in admin.
```
- site: select [gtcollective, surfacelab, corsaclub] (required)
- fullName: text (required)
- email: email (required)
- phone: text (required)
- services: select[] (hasMany)
- message: textarea
- status: select [new, read] (default: new)
- submittedAt: date (auto-set)
```
Access: create from API (no auth), read/update admin only.

#### Services
Service catalog per brand.
```
- site: select [gtcollective, surfacelab, corsaclub] (required)
- name: text (required)
- slug: text (unique per site)
- description: richText
- shortDescription: text
- icon: text (Lucide icon name)
- image: upload (media)
- category: text
- order: number
- featured: checkbox
```

#### TeamMembers
Staff profiles.
```
- site: select [gtcollective, surfacelab, corsaclub] (required)
- name: text (required)
- role: text (required)
- photo: upload (media)
- bio: richText
- order: number
```

#### Partners
Partner/sponsor logos.
```
- site: select [gtcollective, surfacelab, corsaclub] (required)
- name: text (required)
- logo: upload (media, required)
- url: text
- order: number
```

#### Testimonials
Customer reviews.
```
- site: select [gtcollective, surfacelab, corsaclub] (required)
- author: text (required)
- content: textarea (required)
- rating: number (1-5)
- featured: checkbox
```

#### FAQs
FAQ items.
```
- site: select [gtcollective, surfacelab, corsaclub] (required)
- question: text (required)
- answer: richText (required)
- category: text
- order: number
```

#### Media (existing, enhanced)
```
- alt: text (required)
- upload config with R2 storage
- crop: false (no sharp on Workers)
- focalPoint: false
```

#### Users (existing, enhanced)
```
- email (default auth field)
- roles: select [super-admin, admin, editor] (saveToJWT)
- assignedSites: select[] [gtcollective, surfacelab, corsaclub] (hasMany)
```

### Globals

#### CompanyInfo
Per-brand company details. Uses multi-tenant global pattern.
```
- site: select [gtcollective, surfacelab, corsaclub]
- companyName: text
- address: group { street, city, state, postcode }
- phone: text
- email: email
- abn: text
- businessHours: array { day, open, close }
- socialLinks: array { platform, url }
```

#### SEODefaults
Per-brand SEO defaults.
```
- site: select [gtcollective, surfacelab, corsaclub]
- titleTemplate: text (e.g. "%s | SurfaceLab")
- defaultDescription: textarea
- defaultOgImage: upload (media)
- googleAnalyticsId: text
- facebookPixelId: text
```

### Content Blocks

Each block type maps to a React component on the frontend:

| Block Slug | Description | Key Fields |
|---|---|---|
| `hero` | Full-width hero with video/image bg | heading, subheading, backgroundType(video/image), media, cta{label,link} |
| `about` | Brand about/description section | heading, body(richText), highlights[]{icon,title,description} |
| `servicesCarousel` | Horizontal service carousel | heading, services→Services collection, autoplay |
| `servicesGrid` | Grid layout of services | heading, services→Services, columns(2/3/4) |
| `faq` | Accordion FAQ section | heading, faqs→FAQs collection OR inline items |
| `testimonials` | Customer review carousel | heading, testimonials→Testimonials collection |
| `cta` | Call-to-action banner | heading, description, primaryCta{label,link}, secondaryCta, backgroundImage |
| `partnerBrands` | Partner logo showcase | heading, partners→Partners collection |
| `teamGrid` | Team member grid | heading, members→TeamMembers collection |
| `teamCarousel` | Team member carousel | heading, members→TeamMembers collection |
| `values` | Brand values/USP section | heading, values[]{icon,title,description} |
| `certification` | Certification badge (e.g. XPEL) | heading, description, badgeImage, link |
| `contactForm` | Embedded contact form | heading, description, destinationEmail, serviceFilter |
| `richContent` | Free-form rich text section | content(richText), backgroundColor |
| `imageGallery` | Image gallery/grid | heading, images[]{image,caption}, columns |
| `statsBanner` | Statistics/achievement showcase | stats[]{value,label,icon} |
| `facilityShowcase` | Workshop/facility images+text | heading, description, images[], features[] |

## Multi-Tenant Access Control

```typescript
// src/access/tenantAccess.ts
import type { Access } from 'payload'

export const tenantRead: Access = ({ req: { user } }) => {
  if (!user) return false
  if (user.roles?.includes('super-admin')) return true
  return {
    site: { in: user.assignedSites || [] },
  }
}

export const tenantCreate: Access = ({ req: { user } }) => {
  if (!user) return false
  if (user.roles?.includes('super-admin')) return true
  return user.roles?.includes('admin') || user.roles?.includes('editor')
}
```

Hook to auto-set site on create:
```typescript
// src/hooks/setTenantSite.ts
export const setTenantSite: CollectionBeforeChangeHook = ({
  data, req, operation,
}) => {
  if (operation === 'create' && !data.site && req.user?.assignedSites?.length === 1) {
    data.site = req.user.assignedSites[0]
  }
  return data
}
```

## Form Submission Flow

```
1. User fills form on surfacelab.com.au/contact
2. Client validates with Zod + reCAPTCHA v3
3. POST to cms.gtcollective.au/api/form-submissions
   - Custom endpoint (no auth required for create)
   - Server validates reCAPTCHA token
   - Creates FormSubmission document with site='surfacelab'
4. afterChange hook triggers:
   - Send notification email to support (info@surfacelab.au)
   - Send confirmation email to customer
5. Admin sees new submission in dashboard with status='new'
6. Admin can mark as 'read' after reviewing
```

## Frontend Integration Pattern

```typescript
// packages/cms-client/src/client.ts
const CMS_URL = process.env.NEXT_PUBLIC_CMS_URL // e.g. https://cms.gtcollective.au
const SITE = process.env.NEXT_PUBLIC_SITE_ID    // e.g. 'surfacelab'

export async function fetchFromCMS<T>(
  collection: string,
  params: Record<string, any> = {},
): Promise<T> {
  const searchParams = new URLSearchParams({
    'where[site][equals]': SITE,
    ...params,
  })
  const res = await fetch(`${CMS_URL}/api/${collection}?${searchParams}`, {
    next: { revalidate: 60 },
  })
  return res.json()
}
```

```typescript
// apps/surfacelab/src/app/page.tsx
import { getPage } from '@gt-collective/cms-client'

export default async function Home() {
  const page = await getPage('home')
  return <BlockRenderer blocks={page.blocks} />
}
```

## SEO & GEO Content Strategy

### Noosa/Sunshine Coast Focus

**SurfaceLab:**
- Target keywords: "PPF Noosa", "ceramic coating Sunshine Coast", "paint protection Noosaville", "XPEL installer Queensland", "car detailing Noosa Heads"
- Location pages: service area coverage (Noosa, Tewantin, Coolum, Maroochydore)
- Structured data: LocalBusiness schema, Service schema, FAQ schema
- Dynamic sitemap from CMS pages

**GT Collective:**
- Target keywords: "car servicing Noosa", "Porsche specialist Sunshine Coast", "car storage Noosaville", "mechanic Noosa"
- Service-specific landing pages with local SEO
- Google Business Profile optimization content

### Technical SEO
- JSON-LD structured data generated from CMS content
- Dynamic sitemaps per domain (from Pages collection)
- Canonical URLs per domain
- OpenGraph images from CMS Media
- robots.txt per domain
- Meta pixel + GA4 IDs from SEODefaults global

## Phase Breakdown

### Phase 1: Foundation (Monorepo + CMS Core)
1. Create monorepo with pnpm workspaces + Turborepo
2. Move existing CMS into apps/cms
3. Set up shared packages (shared-ui, cms-types, cms-client, email-templates)
4. Build core collections: Pages, Navigation, Footer, Brands, Services, FAQs, Testimonials, Partners, TeamMembers, FormSubmissions
5. Build globals: CompanyInfo, SEODefaults
6. Implement all content blocks for page builder
7. Set up multi-tenant access control
8. Build form submission endpoint with email integration
9. Generate types, run migrations
10. Seed initial content for SurfaceLab

### Phase 2: SurfaceLab Frontend
1. Set up apps/surfacelab from existing codebase
2. Build BlockRenderer component (maps block types → React components)
3. Replace hardcoded Navigation with CMS-driven nav
4. Replace hardcoded Footer with CMS-driven footer
5. Replace hardcoded CompanyInfo with CMS global
6. Convert home page to CMS block-based rendering
7. Convert contact page to use CMS FormSubmissions
8. Build dynamic [slug] page route for CMS pages
9. Implement SEO: JSON-LD, dynamic sitemap, meta tags from CMS
10. GEO content: location-based landing pages

### Phase 3: GT Collective Frontend
1. Set up apps/gtcollective from existing codebase
2. Same CMS integration as SurfaceLab
3. Handle GT Collective-specific components (storage, team, services)
4. Multi-brand navigation (links to SurfaceLab/CorsaClub domains)
5. SEO refresh for GT Collective brand

### Phase 4: Polish & Launch
1. Admin dashboard: enquiry overview, content stats
2. Content migration: seed all hardcoded content into CMS
3. E2E tests for CMS + frontend integration
4. DNS cutover and deployment verification
5. Performance optimization (caching, image optimization)
