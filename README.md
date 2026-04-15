# CAFTAN

CAFTAN is a Next.js 16 storefront and admin dashboard for browsing products and managing orders.

## Stack

- Next.js 16
- React 19
- Tailwind CSS 4
- Supabase SSR
- Radix UI / shadcn-style components

## Development

Install dependencies and start the app:

```bash
npm install
npm run dev
```

To expose the dev server on your local network:

```bash
npm run dev:lan
```

## Environment Variables

Create a `.env.local` file with:

```bash
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-anon-key
```

## Scripts

- `npm run dev` - start the local dev server
- `npm run dev:lan` - start the dev server on `0.0.0.0`
- `npm run build` - create a production build
- `npm run start` - run the production server
- `npm run lint` - run ESLint

## Project Areas

- Storefront pages under `src/app/(marketing)`
- Admin pages under `src/app/(admin)`
- Shared UI components under `src/components`
- Catalog and Supabase helpers under `src/lib`

## Notes

- `node_modules`, `.next`, local env files, and assistant metadata are ignored by Git.
