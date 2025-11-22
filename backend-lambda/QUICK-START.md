# Quick Start - AWS Lambda Deployment

This is a condensed guide for deploying the Lambda backend quickly.

## Prerequisites Check

```bash
# Check AWS CLI
aws --version

# Check Go installation
go version

# Check AWS credentials
aws sts get-caller-identity
```

All commands should succeed before proceeding.

## 1. Create IAM Role (First Time Only)

### Via AWS Console:
1. Go to IAM → Roles → Create Role
2. Select "Lambda" as trusted entity
3. Attach policy: `AWSLambdaBasicExecutionRole`
4. Name: `ssg-one-lambda-role`
5. Copy the Role ARN

### Via AWS CLI:

```bash
# Create trust policy file
cat > /tmp/trust-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

# Create role
aws iam create-role \
  --role-name ssg-one-lambda-role \
  --assume-role-policy-document file:///tmp/trust-policy.json

# Attach execution policy
aws iam attach-role-policy \
  --role-name ssg-one-lambda-role \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole

# Get the role ARN
aws iam get-role --role-name ssg-one-lambda-role --query 'Role.Arn' --output text
```

## 2. Automated Setup (Recommended)

```bash
cd backend-lambda
./setup-lambda.sh
```

Enter when prompted:
- **Region**: `us-east-1` (or your preferred region)
- **Function Name**: `ssg-one-line-broadcaster`
- **Role ARN**: (paste from step 1)
- **LINE Token**: (your LINE Channel Access Token)

**Save the Function URL from the output!**

## 3. Update Frontend

Edit `.env.local` in the root directory:

```bash
NEXT_PUBLIC_API_URL=https://YOUR_FUNCTION_URL_HERE
```

Restart your dev server:

```bash
npm run dev
```

## 4. Test

```bash
# Test via curl
curl -X POST https://YOUR_FUNCTION_URL_HERE \
  -H "Content-Type: application/json" \
  -d '{"message":"Hello from Lambda!"}'

# Expected response:
# {"success":true,"message":"Message sent successfully"}
```

## Update After Code Changes

```bash
cd backend-lambda
./deploy.sh
```

## View Logs

```bash
aws logs tail /aws/lambda/ssg-one-line-broadcaster --follow
```

## Common Issues

### Build fails
```bash
cd backend-lambda
make deps
make clean
make build
```

### Lambda not found
- Wait 30 seconds after creation
- Verify function name and region match

### 500 errors
- Check CloudWatch logs
- Verify LINE_CHANNEL_ACCESS_TOKEN is set correctly

## Manual Deployment (Alternative)

If automated setup fails:

```bash
cd backend-lambda
make build

aws lambda create-function \
  --function-name ssg-one-line-broadcaster \
  --runtime provided.al2023 \
  --handler bootstrap \
  --architectures x86_64 \
  --zip-file fileb://function.zip \
  --role arn:aws:iam::ACCOUNT_ID:role/ssg-one-lambda-role \
  --environment Variables="{LINE_CHANNEL_ACCESS_TOKEN=YOUR_TOKEN}" \
  --timeout 30 \
  --memory-size 256 \
  --region us-east-1

aws lambda create-function-url-config \
  --function-name ssg-one-line-broadcaster \
  --auth-type NONE \
  --cors AllowOrigins="*",AllowMethods="POST,OPTIONS",AllowHeaders="content-type" \
  --region us-east-1

aws lambda add-permission \
  --function-name ssg-one-line-broadcaster \
  --statement-id FunctionURLAllowPublicAccess \
  --action lambda:InvokeFunctionUrl \
  --principal "*" \
  --function-url-auth-type NONE \
  --region us-east-1
```

## Cleanup

To remove all AWS resources:

```bash
# Delete Function URL
aws lambda delete-function-url-config \
  --function-name ssg-one-line-broadcaster

# Delete Function
aws lambda delete-function \
  --function-name ssg-one-line-broadcaster

# Delete IAM Role (if not used elsewhere)
aws iam detach-role-policy \
  --role-name ssg-one-lambda-role \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole

aws iam delete-role --role-name ssg-one-lambda-role
```

## That's It!

Your Lambda backend is now deployed and your Next.js app will use it for sending LINE messages.

For detailed documentation, see [README.md](README.md)
