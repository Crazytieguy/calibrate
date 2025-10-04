# Calibrate

A confidence-weighted forecasting and prediction platform for organizations.

Make accurate predictions on yes/no and numeric questions, earn clips 📎 based on forecast accuracy, and compete on the leaderboard.

Built with React, Convex, TanStack Router, Clerk, Vite, and Tailwind CSS.

## Quick Start

```bash
pnpm install
pnpm dev
```

## Features

- **Yes/No & Numeric Questions** - Create binary or numeric range forecasting questions
- **Confidence-Weighted Forecasting** - Submit predictions with confidence levels (1-10)
- **Scoring System** - Earn clips based on forecast accuracy and confidence
- **Leaderboard** - Track top forecasters by clips earned
- **Question Resolution** - Question creators can resolve and score all forecasts
- **Real-time Updates** - Live updates powered by Convex

## Project Structure

```
├── convex/
│   ├── forecasts.ts      # Forecast submission and scoring
│   ├── questions.ts       # Question creation and management
│   ├── schema.ts          # Database schema
│   └── users.ts           # User management and leaderboard
├── src/
│   ├── routes/
│   │   ├── questions/
│   │   │   ├── $id.tsx   # Question detail and forecasting
│   │   │   └── new.tsx   # Create new question
│   │   ├── __root.tsx    # Root layout with navigation
│   │   ├── index.tsx     # Questions list
│   │   └── leaderboard.tsx
│   ├── index.css
│   └── main.tsx
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## How It Works

1. **Create Questions** - Define yes/no or numeric questions with close dates
2. **Submit Forecasts** - Users submit probability/prediction + confidence (1-10)
3. **Resolve Questions** - Creators enter actual outcomes when questions close
4. **Earn Clips** - Score = accuracy × confidence, earn clips based on performance
5. **Climb Leaderboard** - Top forecasters ranked by total clips earned

## License

MIT