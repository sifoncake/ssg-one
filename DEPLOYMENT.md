# Deployment Guide

This document provides a quick reference for deploying SSG ONE in different configurations.

## Table of Contents

- [Local Development](#local-development)
- [AWS Lambda Production](#aws-lambda-production)
- [Switching Between Modes](#switching-between-modes)
- [Troubleshooting](#troubleshooting)

## Local Development

### Initial Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure environment:
   ```bash
   cp .env.example .env.local
   ```

3. Edit `.env.local`:
   ```bash
   LINE_CHANNEL_ACCESS_TOKEN=your_token_here
   # Leave NEXT_PUBLIC_API_URL commented out
   ```

4. Run development server:
   ```bash
   npm run dev
   ```

5. Open http://localhost:3000

### Advantages
- Fast development cycle
- No AWS costs
- Easy debugging
- TypeScript type checking

### Disadvantages
- Server must stay running
- No auto-scaling
- Local network only (without tunneling)

## AWS Lambda Production

### Prerequisites

1. AWS CLI installed and configured:
   ```bash
   aws configure
   ```

2. IAM role with Lambda execution permissions:
   - `AWSLambdaBasicExecutionRole` policy attached

3. Go 1.21+ installed (for building):
   ```bash
   go version
   ```

### Quick Deployment (Recommended)

```bash
cd backend-lambda
./setup-lambda.sh
```

Follow the interactive prompts:
1. AWS Region (e.g., `us-east-1`)
2. Function Name (e.g., `ssg-one-line-broadcaster`)
3. IAM Role ARN (from AWS Console)
4. LINE Channel Access Token

The script outputs a Function URL. Copy it!

### Manual Deployment

See detailed instructions in [`backend-lambda/README.md`](backend-lambda/README.md)

### Configure Frontend

1. Edit `.env.local`:
   ```bash
   NEXT_PUBLIC_API_URL=https://your-function-url.lambda-url.us-east-1.on.aws
   ```

2. Restart Next.js:
   ```bash
   npm run dev
   ```

### Updating Lambda Code

After making changes to `backend-lambda/main.go`:

```bash
cd backend-lambda
./deploy.sh
```

### Advantages
- Serverless (no server management)
- Auto-scaling
- Pay-per-use pricing (~$0.02/month for light use)
- High availability
- Global edge locations

### Disadvantages
- Cold start latency (first request)
- AWS costs (minimal for low traffic)
- Requires AWS knowledge
- More complex deployment

## Switching Between Modes

### Switch to Local Development

1. Edit `.env.local`:
   ```bash
   # Comment out or remove this line:
   # NEXT_PUBLIC_API_URL=https://...
   ```

2. Restart dev server:
   ```bash
   npm run dev
   ```

### Switch to Lambda

1. Edit `.env.local`:
   ```bash
   # Uncomment and set your Lambda URL:
   NEXT_PUBLIC_API_URL=https://your-function-url.lambda-url.us-east-1.on.aws
   ```

2. Restart dev server:
   ```bash
   npm run dev
   ```

### Verify Current Mode

Check your browser console. The API request will go to:
- **Local**: `http://localhost:3000/api/send-line`
- **Lambda**: `https://your-function-url.lambda-url.us-east-1.on.aws`

## Troubleshooting

### Local Development Issues

**Problem**: `LINE credentials not configured`
- **Solution**: Check `.env.local` has `LINE_CHANNEL_ACCESS_TOKEN` set

**Problem**: TypeScript errors
- **Solution**: Run `npm install` and restart dev server

**Problem**: PORT already in use
- **Solution**: Kill the process using port 3000 or use a different port:
  ```bash
  PORT=3001 npm run dev
  ```

### Lambda Deployment Issues

**Problem**: `go: command not found`
- **Solution**: Install Go from https://golang.org/dl/

**Problem**: AWS CLI errors
- **Solution**: Run `aws configure` and set credentials

**Problem**: Permission denied on scripts
- **Solution**: Make scripts executable:
  ```bash
  chmod +x backend-lambda/*.sh
  ```

**Problem**: Lambda returns 500 error
- **Solution**: Check CloudWatch logs:
  ```bash
  aws logs tail /aws/lambda/ssg-one-line-broadcaster --follow
  ```

**Problem**: CORS errors from frontend
- **Solution**: Verify Function URL CORS configuration:
  ```bash
  aws lambda get-function-url-config --function-name ssg-one-line-broadcaster
  ```

### LINE API Issues

**Problem**: `Failed to send LINE message`
- **Solution**:
  1. Verify LINE token is valid
  2. Check bot has friends added
  3. Ensure broadcast messaging is enabled in LINE Console

**Problem**: No message received
- **Solution**:
  1. Check bot is added as friend on LINE app
  2. Verify LINE API quota/limits
  3. Check CloudWatch/Next.js logs for errors

## Environment Variables Reference

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `LINE_CHANNEL_ACCESS_TOKEN` | Yes | LINE Messaging API token | `abc123...` |
| `NEXT_PUBLIC_API_URL` | No* | Lambda Function URL | `https://xyz.lambda-url.us-east-1.on.aws` |
| `MAGIC_LINK_BASE_URL` | Yes** | Frontend URL for magic links (Lambda) | `https://your-app.vercel.app` or `your-app.vercel.app` |
| `VERCEL_URL` | No*** | Alternative to MAGIC_LINK_BASE_URL (e.g. set by Vercel) | `your-app.vercel.app` |

\* Required only when using Lambda backend  
\** Required for Lambda when using "管理画面" magic link; no hardcoded fallback.  
\*** Lambda uses MAGIC_LINK_BASE_URL first, then VERCEL_URL. Set one of them.

## Cost Estimation

### Local Development
- **Cost**: $0/month (only electricity)

### AWS Lambda
For 10,000 messages/month:
- **Lambda Requests**: $0.002
- **Lambda Duration**: $0.021
- **Total**: ~$0.023/month

For 100,000 messages/month:
- **Total**: ~$0.23/month

*Note: AWS Free Tier includes 1M free Lambda requests/month*

## Production Checklist

Before deploying to production:

- [ ] Environment variables configured
- [ ] LINE bot has friends/followers
- [ ] Lambda function deployed and tested
- [ ] Function URL updated in frontend
- [ ] CORS configured correctly
- [ ] CloudWatch logs accessible
- [ ] Error handling tested
- [ ] Cost alerts configured (optional)

## Next Steps

- Set up monitoring with AWS CloudWatch
- Configure custom domain for Function URL
- Implement message queuing for high volume
- Add authentication to Lambda endpoint
- Set up CI/CD pipeline for deployments
