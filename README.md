# SSG ONE - LINE Messaging Application

A Next.js 14 application with TypeScript that allows you to broadcast messages to all friends of your LINE bot.

## Features

- Simple form interface with text input
- API route to broadcast messages to LINE Messaging API
- Sends messages to all friends who have added your LINE bot
- **Dual deployment modes**: Local development (Next.js API) or AWS Lambda
- Environment variable configuration for security
- TypeScript for type safety
- Tailwind CSS for styling
- Go-based AWS Lambda backend for production scalability

## Prerequisites

### For Local Development:
- Node.js 18+ installed
- A LINE Messaging API account
- LINE Channel Access Token

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
   - Fill in your LINE Channel Access Token:
     ```
     LINE_CHANNEL_ACCESS_TOKEN=your_actual_channel_access_token
     ```

3. **Get your LINE credentials:**
   - Go to [LINE Developers Console](https://developers.line.biz/console/)
   - Create a new channel or use existing one
   - Get your Channel Access Token from the Messaging API settings
   - Make sure your bot has friends added to receive broadcast messages

4. **Run the development server:**
   ```bash
   npm run dev
   ```

5. **Open your browser:**
   - Navigate to [http://localhost:3000](http://localhost:3000)
   - Enter a message and click "Send Message"

## Project Structure

```
ssg-one/
├── app/                        # Next.js frontend
│   ├── api/
│   │   └── send-line/
│   │       └── route.ts        # Next.js API route (local dev)
│   ├── globals.css             # Global styles
│   ├── layout.tsx              # Root layout
│   └── page.tsx                # Home page with form
├── backend-lambda/             # AWS Lambda backend (Go)
│   ├── main.go                 # Lambda handler function
│   ├── go.mod                  # Go module definition
│   ├── go.sum                  # Go dependencies
│   ├── Makefile                # Build commands
│   ├── deploy.sh               # Deployment script
│   ├── setup-lambda.sh         # Initial setup script
│   └── README.md               # Lambda documentation
├── .env.local                  # Environment variables (not in git)
├── .env.example                # Environment variables template
├── next.config.js              # Next.js configuration
├── postcss.config.js           # PostCSS configuration
├── tsconfig.json               # TypeScript configuration
└── package.json                # Project dependencies
```

## API Endpoint

### POST /api/send-line

Broadcasts a message to all friends of the LINE bot.

**Request body:**
```json
{
  "message": "Your message here"
}
```

**Success response:**
```json
{
  "success": true,
  "message": "Message sent successfully"
}
```

**Error response:**
```json
{
  "error": "Error message here"
}
```

## Deployment Options

### Option 1: Local Development (Default)

The application uses the Next.js API route by default:

```bash
npm run dev
```

Your `.env.local` should have:
```
LINE_CHANNEL_ACCESS_TOKEN=your_token
# NEXT_PUBLIC_API_URL is commented out or not set
```

### Option 2: AWS Lambda Backend

#### Quick Setup (Automated):

```bash
cd backend-lambda
./setup-lambda.sh
```

Follow the prompts to:
1. Specify AWS region
2. Enter function name
3. Provide IAM role ARN
4. Enter LINE Channel Access Token

The script will create the Lambda function and provide you with a Function URL.

#### Manual Setup:

See detailed instructions in [`backend-lambda/README.md`](backend-lambda/README.md)

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

Comment out `NEXT_PUBLIC_API_URL` in `.env.local` and restart dev server.

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

## Project Architecture

```
┌─────────────────┐
│   Next.js App   │
│   (Frontend)    │
└────────┬────────┘
         │
         │ API Call
         │
         ▼
┌────────────────────────┐
│  Backend (Choose One)  │
├────────────────────────┤
│                        │
│ 1. Next.js API Route   │ ← Local Development
│    /app/api/send-line/ │
│                        │
│        OR              │
│                        │
│ 2. AWS Lambda (Go)     │ ← Production
│    backend-lambda/     │
│                        │
└────────┬───────────────┘
         │
         │ HTTPS Request
         │
         ▼
┌────────────────────┐
│  LINE Messaging    │
│      API           │
└────────────────────┘
```

## Technologies Used

### Frontend:
- [Next.js 14](https://nextjs.org/) - React framework with App Router
- [TypeScript](https://www.typescriptlang.org/) - Type safety
- [Tailwind CSS](https://tailwindcss.com/) - Styling

### Backend (Local):
- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers) - Built-in API handling
- [Axios](https://axios-http.com/) - HTTP client for LINE API

### Backend (AWS Lambda):
- [Go](https://golang.org/) - High-performance compiled language
- [AWS Lambda](https://aws.amazon.com/lambda/) - Serverless compute
- [AWS Lambda Go SDK](https://github.com/aws/aws-lambda-go) - Lambda runtime

### External APIs:
- [LINE Messaging API](https://developers.line.biz/en/docs/messaging-api/) - Messaging platform

