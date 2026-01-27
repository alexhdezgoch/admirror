# AdMirror

Competitive ad intelligence platform for agencies. Track competitor Meta ads, analyze creative patterns with AI, and build swipe files of winning ads.

## Features

- **Multi-brand workspaces** — manage competitive intel per client brand
- **Ad scraping** — sync ads from Meta Ad Library via Apify
- **AI analysis** — score ads using Gemini vision (hooks, creative blueprints, Hormozi value equation)
- **Velocity signals** — classify ads as cash cows, rising stars, zombies, etc.
- **Gallery & filters** — browse ads by format, score, competitor
- **Trend detection** — surface emerging creative patterns across competitors
- **Swipe file** — save high-performing ads for reference

## Tech Stack

- **Frontend:** Next.js 14, React 18, TypeScript, Tailwind CSS
- **Backend:** Next.js API routes, Supabase (auth + Postgres), Stripe
- **AI:** Google Gemini 2.0 Flash (vision)
- **Scraping:** Apify (Meta Ad Library)

## Getting Started

### Prerequisites

- Node.js 18+
- Supabase project
- Stripe account
- Apify account
- Google Gemini API key

### Setup

1. Clone the repo:
   ```bash
   git clone git@github.com:alexhdezgoch/admirror.git
   cd admirror
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy environment variables:
   ```bash
   cp .env.example .env.local
   ```

4. Fill in `.env.local` with your API keys (see `.env.example` for details).

5. Run the Supabase migrations:
   ```bash
   npx supabase db push
   ```

6. Start the dev server:
   ```bash
   npm run dev
   ```

7. Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
src/
├── app/                    # Next.js App Router pages & API routes
│   ├── brands/[brandId]/   # Brand dashboard, gallery, competitors, trends
│   ├── settings/           # Billing & subscription management
│   └── api/                # Analyze, sync, Stripe endpoints
├── components/             # React components
├── context/                # Auth & brand state providers
├── lib/                    # Supabase, Stripe, Apify clients & utilities
└── types/                  # TypeScript types
```
