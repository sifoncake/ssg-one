# SSG ONE - Multi-Store Operations Platform

SSG ONE is a multi-store wellness business management platform with an admin dashboard, LINE messaging operations, and passwordless authentication. The frontend runs on Next.js; the production backend runs on AWS Lambda (Go).

**Repository policy:** This project is maintained for public visibility. Do not commit secrets, API keys, or environment files containing credentials; use `.env.local` (gitignored) and configure Lambda env vars outside the repo.

## Features

- Admin dashboard with multi-store analytics
- Staff, customer, and sales management pages
- LINE messaging operations (broadcast and targeted push)
- Passwordless magic-link authentication with 2FA fallback and device recognition
- **Dual deployment modes**: Local development (Next.js API routes) or AWS Lambda

## Prerequisites

### For Local Development:
- Node.js 18+ installed
- A LINE Messaging API account
- A Supabase project (URL/keys)

### For AWS Lambda Deployment (Optional):
- AWS CLI configured
- AWS account with Lambda permissions
- Go 1.21+ installed (for building Lambda function)

## Setup Instructions

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables:**
   - Copy `.env.example` to `.env.local`
   - Fill in required values:
     - `LINE_CHANNEL_ACCESS_TOKEN`, `LINE_CHANNEL_SECRET`
     - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - `SUPABASE_SERVICE_ROLE_KEY`
     - Optional: `SUPABASE_URL`, `SUPABASE_KEY` (Lambda)
     - Optional: `NEXT_PUBLIC_API_URL` (Lambda Function URL)
     - Optional: `NEXT_PUBLIC_LIFF_ID` (if using the LIFF flow)

3. **Run the development server:**
   ```bash
   npm run dev
   ```

4. **Open your browser:**
   - Navigate to [http://localhost:3001](http://localhost:3001)

## Project Structure

```
ssg-one/
├── app/                        # Next.js frontend (App Router)
│   ├── admin/                  # Admin dashboard pages
│   ├── auth/                   # Magic link flow
│   ├── api/                    # Local dev API routes
│   │   ├── auth/
│   │   │   ├── create-session/route.ts
│   │   │   └── verify-magic/route.ts
│   │   └── send-line/route.ts
│   ├── layout.tsx              # Root layout
│   └── page.tsx                # Landing/login entry
├── backend-lambda/             # AWS Lambda backend (Go)
│   ├── handlers/               # API handlers
│   ├── services/               # LINE/Supabase/Claude services
│   ├── main.go                 # Lambda entry
│   ├── Makefile                # Build commands
│   ├── deploy.sh               # Deployment script
│   └── setup-lambda.sh         # Initial setup script
├── lib/                        # Shared utilities
├── .env.example                # Environment variables template
├── next.config.js              # Next.js configuration
├── postcss.config.js           # PostCSS configuration
├── tsconfig.json               # TypeScript configuration
└── package.json                # Project dependencies
```

## API Endpoints (Local Dev)

- **POST /api/send-line**: Broadcast a message to LINE
- **POST /api/auth/create-session**: Generate a magic-link token via Supabase Admin
- **POST /api/auth/verify-magic**: Proxy magic-link verification to Lambda

## Deployment Options

### Option 1: Local Development (Default)

The application uses Next.js API routes by default:

```bash
npm run dev
```

Leave `NEXT_PUBLIC_API_URL` commented out in `.env.local`.

### Option 2: AWS Lambda Backend

#### Quick Setup (Automated):

```bash
cd backend-lambda
./setup-lambda.sh
```

Follow the prompts to configure AWS and create the function.

#### Switch to Lambda Backend:

1. After deploying Lambda, update `.env.local`:
   ```
   NEXT_PUBLIC_API_URL=https://your-lambda-url.lambda-url.us-east-1.on.aws
   ```

2. Restart your Next.js dev server:
   ```bash
   npm run dev
   ```

#### Update Lambda Function:

```bash
cd backend-lambda
./deploy.sh
```

#### Switch Back to Local:

Comment out `NEXT_PUBLIC_API_URL` in `.env.local` and restart the dev server.

## Build for Production

### Next.js Application:

```bash
npm run build
npm start
```

### Lambda Function:

```bash
cd backend-lambda
make build
# Creates function.zip ready for deployment
```

## Technologies Used

- [Next.js 16](https://nextjs.org/) - React framework with App Router
- [TypeScript](https://www.typescriptlang.org/) - Type safety
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [Supabase](https://supabase.com/) - Database and auth
- [Go](https://golang.org/) - Lambda backend
- [AWS Lambda](https://aws.amazon.com/lambda/) - Serverless compute
- [LINE Messaging API](https://developers.line.biz/en/docs/messaging-api/) - Messaging platform
- [LIFF](https://developers.line.biz/en/docs/liff/) - LINE in-app login

## License

MIT. See `LICENSE.md`.

Third-party dependencies are licensed by their respective owners. LINE/LIFF usage is subject to LINE's terms:
- https://developers.line.biz/en/docs/liff/developing-liff-apps/
- https://terms2.line.me/LINE
