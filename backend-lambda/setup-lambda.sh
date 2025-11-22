#!/bin/bash

# Setup script for creating AWS Lambda function
# Usage: ./setup-lambda.sh

set -e

echo "========================================"
echo "AWS Lambda Setup for SSG ONE"
echo "========================================"
echo ""

# Prompt for configuration
read -p "AWS Region [us-east-1]: " AWS_REGION
AWS_REGION=${AWS_REGION:-us-east-1}

read -p "Function Name [ssg-one-line-broadcaster]: " FUNCTION_NAME
FUNCTION_NAME=${FUNCTION_NAME:-ssg-one-line-broadcaster}

read -p "IAM Role ARN: " ROLE_ARN
if [ -z "$ROLE_ARN" ]; then
    echo "Error: IAM Role ARN is required"
    exit 1
fi

read -sp "LINE Channel Access Token: " LINE_TOKEN
echo ""

if [ -z "$LINE_TOKEN" ]; then
    echo "Error: LINE Channel Access Token is required"
    exit 1
fi

# Build the function
echo ""
echo "Building Lambda function..."
make clean
make build

# Create Lambda function
echo ""
echo "Creating Lambda function..."
aws lambda create-function \
  --function-name $FUNCTION_NAME \
  --runtime provided.al2023 \
  --handler bootstrap \
  --architectures x86_64 \
  --zip-file fileb://function.zip \
  --role $ROLE_ARN \
  --environment Variables="{LINE_CHANNEL_ACCESS_TOKEN=$LINE_TOKEN}" \
  --timeout 30 \
  --memory-size 256 \
  --region $AWS_REGION

echo ""
echo "Waiting for function to be active..."
aws lambda wait function-active \
  --function-name $FUNCTION_NAME \
  --region $AWS_REGION

# Create Function URL
echo ""
echo "Creating Function URL..."
FUNCTION_URL=$(aws lambda create-function-url-config \
  --function-name $FUNCTION_NAME \
  --auth-type NONE \
  --cors AllowOrigins="*",AllowMethods="POST,OPTIONS",AllowHeaders="content-type" \
  --region $AWS_REGION \
  --query 'FunctionUrl' \
  --output text)

# Add permission for Function URL
echo ""
echo "Adding Function URL permissions..."
aws lambda add-permission \
  --function-name $FUNCTION_NAME \
  --statement-id FunctionURLAllowPublicAccess \
  --action lambda:InvokeFunctionUrl \
  --principal "*" \
  --function-url-auth-type NONE \
  --region $AWS_REGION

echo ""
echo "========================================"
echo "✅ Setup Complete!"
echo "========================================"
echo ""
echo "Function Name: $FUNCTION_NAME"
echo "Function URL: $FUNCTION_URL"
echo "Region: $AWS_REGION"
echo ""
echo "Next steps:"
echo "1. Update your .env.local with:"
echo "   NEXT_PUBLIC_API_URL=$FUNCTION_URL"
echo ""
echo "2. Restart your Next.js dev server:"
echo "   npm run dev"
echo ""
echo "3. Test the function:"
echo "   curl -X POST $FUNCTION_URL \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"message\":\"Test from Lambda!\"}'"
echo ""
