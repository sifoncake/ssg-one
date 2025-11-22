#!/bin/bash

# Deploy script for AWS Lambda
# Usage: ./deploy.sh [function-name] [aws-region]

set -e

FUNCTION_NAME=${1:-ssg-one-line-broadcaster}
AWS_REGION=${2:-ap-northeast-1}

echo "========================================"
echo "Deploying Lambda Function"
echo "========================================"
echo "Function Name: $FUNCTION_NAME"
echo "Region: $AWS_REGION"
echo ""

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "Error: AWS CLI is not installed"
    echo "Install it from: https://aws.amazon.com/cli/"
    exit 1
fi

# Check if Go is installed
if ! command -v go &> /dev/null; then
    echo "Error: Go is not installed"
    echo "Install it from: https://golang.org/dl/"
    exit 1
fi

# Build the Lambda function
echo "Building Lambda function..."
make clean
make build

if [ ! -f function.zip ]; then
    echo "Error: function.zip not found"
    exit 1
fi

# Check if function exists
FUNCTION_EXISTS=$(aws lambda get-function --function-name $FUNCTION_NAME --region $AWS_REGION 2>&1 || true)

if echo "$FUNCTION_EXISTS" | grep -q "ResourceNotFoundException"; then
    echo ""
    echo "Function does not exist. Please create it first using AWS CLI or Console."
    echo ""
    echo "Example command:"
    echo "aws lambda create-function \\"
    echo "  --function-name $FUNCTION_NAME \\"
    echo "  --runtime provided.al2023 \\"
    echo "  --handler bootstrap \\"
    echo "  --architectures x86_64 \\"
    echo "  --zip-file fileb://function.zip \\"
    echo "  --role arn:aws:iam::YOUR_ACCOUNT_ID:role/YOUR_LAMBDA_ROLE \\"
    echo "  --environment Variables=\"{LINE_CHANNEL_ACCESS_TOKEN=YOUR_TOKEN}\" \\"
    echo "  --timeout 30 \\"
    echo "  --memory-size 256 \\"
    echo "  --region $AWS_REGION"
    exit 1
else
    echo "Updating existing Lambda function..."
    aws lambda update-function-code \
        --function-name $FUNCTION_NAME \
        --zip-file fileb://function.zip \
        --region $AWS_REGION

    echo ""
    echo "Waiting for function to be updated..."
    aws lambda wait function-updated \
        --function-name $FUNCTION_NAME \
        --region $AWS_REGION

    echo ""
    echo "✅ Deployment successful!"
    echo ""

    # Get Function URL if it exists
    FUNCTION_URL=$(aws lambda get-function-url-config \
        --function-name $FUNCTION_NAME \
        --region $AWS_REGION \
        --query 'FunctionUrl' \
        --output text 2>/dev/null || echo "")

    if [ -n "$FUNCTION_URL" ]; then
        echo "Function URL: $FUNCTION_URL"
        echo ""
        echo "Update your .env.local with:"
        echo "NEXT_PUBLIC_API_URL=$FUNCTION_URL"
    fi
fi

echo ""
echo "To view logs:"
echo "aws logs tail /aws/lambda/$FUNCTION_NAME --follow --region $AWS_REGION"
