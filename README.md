# CreatorMatch Local

A marketplace connecting local businesses with micro-influencers (1K-50K followers) in their area.

## Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS, Mapbox GL
- **Backend**: Node.js, Express, TypeScript, Prisma ORM
- **Database**: PostgreSQL with PostGIS for geospatial queries
- **Payments**: Stripe Connect (Express accounts for creators, Subscriptions for businesses)
- **Monorepo**: Turborepo with pnpm workspaces

## Project Structure

```
creatormatch-local/
├── apps/
│   ├── web/          # Next.js frontend
│   └── api/          # Express backend
└── packages/
    ├── shared-types/ # TypeScript types
    └── shared-utils/ # Validation, formatting, constants
```

## Features

- **Location-Based Discovery**: Find creators near your business using PostGIS
- **AI-Powered Matching**: Smart algorithm matches campaigns with creators
- **Campaign Management**: Create and manage influencer campaigns
- **Deal Workflow**: Propose, accept, submit, approve, complete collaborations
- **Secure Payments**: Stripe Connect for creator payouts, subscriptions for businesses
- **Real-time Messaging**: Chat between businesses and creators

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm 8+
- PostgreSQL with PostGIS extension
- Stripe account (for payments)
- Mapbox account (for maps)

### Installation

1. Clone the repository:
```bash
git clone <repo-url>
cd creatormatch-local
```

2. Install dependencies:
```bash
pnpm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your credentials
```

4. Set up the database:
```bash
# Enable PostGIS in your PostgreSQL database
CREATE EXTENSION postgis;

# Run migrations
pnpm db:migrate

# Seed sample data
pnpm db:seed
```

5. Start development servers:
```bash
pnpm dev
```

The frontend runs on http://localhost:3000 and the API on http://localhost:3001.

### Test Accounts

After seeding:
- **Business**: business@example.com / Password123
- **Creator**: sarah@example.com / Password123

## API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login
- `POST /api/v1/auth/refresh` - Refresh token
- `GET /api/v1/auth/me` - Get current user

### Creators
- `GET /api/v1/creators` - Search creators (with geo filters)
- `GET /api/v1/creators/:id` - Get creator profile
- `PATCH /api/v1/creators/me/profile` - Update own profile

### Businesses
- `GET /api/v1/businesses/:id` - Get business profile
- `POST /api/v1/businesses/me/subscription/checkout` - Start subscription

### Campaigns
- `GET /api/v1/campaigns` - List campaigns
- `POST /api/v1/campaigns` - Create campaign
- `POST /api/v1/campaigns/:id/launch` - Launch campaign

### Matches
- `GET /api/v1/matches/campaign/:id` - Get matches for campaign
- `POST /api/v1/matches/campaign/:id/calculate` - Recalculate matches

### Deals
- `GET /api/v1/deals` - List deals
- `POST /api/v1/deals` - Create deal
- `POST /api/v1/deals/:id/accept` - Accept deal (creator)
- `POST /api/v1/deals/:id/submit` - Submit content
- `POST /api/v1/deals/:id/approve` - Approve content (business)

## Pricing

- **Creators**: Free
- **Businesses**: $49/month subscription + 10% transaction fee
- 14-day free trial for businesses

## Match Scoring Algorithm

Matches are scored 0-100 based on weighted factors:
- Niche alignment (25%)
- Location proximity (20%)
- Engagement rate (20%)
- Follower count fit (15%)
- Price compatibility (10%)
- Availability (5%)
- Past performance (5%)

## License

MIT
