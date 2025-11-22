# Backend Lambda - Go Implementation

This directory contains the AWS Lambda function implementation in Go for sending LINE broadcast messages.

## Architecture

The application supports two modes:
1. **Local Development**: Uses Next.js API route (`/app/api/send-line/route.ts`)
2. **Production (AWS)**: Uses AWS Lambda function (this directory)

## Prerequisites

- Go 1.21 or higher
- AWS CLI configured with appropriate credentials
- AWS Lambda permissions
- LINE Channel Access Token

## Local Development Testing

### Build the Lambda function locally:
```bash
cd backend-lambda
make build-local
```

### Install dependencies:
```bash
make deps
```

## AWS Deployment

### 1. Build the Lambda Function

```bash
cd backend-lambda
make build
```

This will create a `function.zip` file ready for deployment.

### 2. Create Lambda Function via AWS CLI

```bash
# Create the Lambda function
aws lambda create-function \
  --function-name ssg-one-line-broadcaster \
  --runtime provided.al2023 \
  --handler bootstrap \
  --architectures x86_64 \
  --zip-file fileb://function.zip \
  --role arn:aws:iam::YOUR_ACCOUNT_ID:role/YOUR_LAMBDA_ROLE \
  --environment Variables="{LINE_CHANNEL_ACCESS_TOKEN=YOUR_TOKEN}" \
  --timeout 30 \
  --memory-size 256
```

### 3. Create Function URL (for public access)

```bash
# Create a Function URL for the Lambda
aws lambda create-function-url-config \
  --function-name ssg-one-line-broadcaster \
  --auth-type NONE \
  --cors AllowOrigins="*",AllowMethods="POST,OPTIONS",AllowHeaders="content-type"

# Add permission for public access via Function URL
aws lambda add-permission \
  --function-name ssg-one-line-broadcaster \
  --statement-id FunctionURLAllowPublicAccess \
  --action lambda:InvokeFunctionUrl \
  --principal "*" \
  --function-url-auth-type NONE
```

The output will include a `FunctionUrl` - save this URL.

### 4. Update Lambda Function (for subsequent deployments)

```bash
# Rebuild
make clean
make build

# Update the Lambda function
aws lambda update-function-code \
  --function-name ssg-one-line-broadcaster \
  --zip-file fileb://function.zip
```

### 5. Update Environment Variables

```bash
aws lambda update-function-configuration \
  --function-name ssg-one-line-broadcaster \
  --environment Variables="{LINE_CHANNEL_ACCESS_TOKEN=YOUR_NEW_TOKEN}"
```

## Alternative: Deploy with AWS SAM

Create a `template.yaml` file:

```yaml
AWSTemplateFormatVersion: '2010-09-09'
Transform: AWS::Serverless-2016-10-31

Resources:
  LineBoradcasterFunction:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: ./
      Handler: bootstrap
      Runtime: provided.al2023
      Architectures:
        - x86_64
      MemorySize: 256
      Timeout: 30
      Environment:
        Variables:
          LINE_CHANNEL_ACCESS_TOKEN: !Ref LineChannelAccessToken
      FunctionUrlConfig:
        AuthType: NONE
        Cors:
          AllowOrigins:
            - "*"
          AllowMethods:
            - POST
            - OPTIONS
          AllowHeaders:
            - content-type

Parameters:
  LineChannelAccessToken:
    Type: String
    Description: LINE Channel Access Token
    NoEcho: true

Outputs:
  FunctionUrl:
    Description: "Lambda Function URL"
    Value: !GetAtt LineBoradcasterFunctionUrl.FunctionUrl
```

Deploy with SAM:
```bash
sam build
sam deploy --guided --parameter-overrides LineChannelAccessToken=YOUR_TOKEN
```

## Configure Frontend to Use Lambda

After deployment, update your `.env.local` in the Next.js project:

```bash
# Uncomment and set to your Lambda Function URL
NEXT_PUBLIC_API_URL=https://your-function-url.lambda-url.us-east-1.on.aws
```

## Switching Between Local and Lambda

### Use Local Next.js API:
```bash
# In .env.local - comment out or remove:
# NEXT_PUBLIC_API_URL=...
```

### Use Lambda:
```bash
# In .env.local - uncomment and set:
NEXT_PUBLIC_API_URL=https://your-function-url.lambda-url.us-east-1.on.aws
```

Then restart your Next.js dev server:
```bash
npm run dev
```

## IAM Role Requirements

Your Lambda execution role needs:
- `AWSLambdaBasicExecutionRole` (for CloudWatch Logs)

Example policy:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:*:*:*"
    }
  ]
}
```

## Testing the Lambda Function

### Test locally with sample event:
Create `test-event.json`:
```json
{
  "httpMethod": "POST",
  "body": "{\"message\":\"Hello from Lambda!\"}"
}
```

### Invoke via AWS CLI:
```bash
aws lambda invoke \
  --function-name ssg-one-line-broadcaster \
  --payload file://test-event.json \
  response.json

cat response.json
```

### Test via HTTP:
```bash
curl -X POST https://your-function-url.lambda-url.us-east-1.on.aws \
  -H "Content-Type: application/json" \
  -d '{"message":"Test message"}'
```

## Monitoring

View logs in CloudWatch:
```bash
aws logs tail /aws/lambda/ssg-one-line-broadcaster --follow
```

## Cost Estimation

AWS Lambda pricing (as of 2024):
- **Requests**: $0.20 per 1M requests
- **Duration**: $0.0000166667 per GB-second

Example cost for 10,000 messages/month with 256MB memory and 500ms execution:
- Requests: 10,000 * $0.20 / 1,000,000 = $0.002
- Duration: 10,000 * 0.5s * 256/1024 GB * $0.0000166667 = $0.021
- **Total**: ~$0.023/month (plus free tier benefits)

## Troubleshooting

### Function returns 500 error:
- Check CloudWatch logs for errors
- Verify LINE_CHANNEL_ACCESS_TOKEN is set correctly
- Ensure the Lambda has internet access (check VPC settings if applicable)

### CORS errors:
- Verify Function URL CORS configuration
- Check that OPTIONS requests are handled

### Timeout errors:
- Increase Lambda timeout if LINE API is slow
- Check LINE API status

## Clean Up

Remove AWS resources:
```bash
# Delete Function URL configuration
aws lambda delete-function-url-config \
  --function-name ssg-one-line-broadcaster

# Delete the Lambda function
aws lambda delete-function \
  --function-name ssg-one-line-broadcaster
```

Clean local build files:
```bash
make clean
```
