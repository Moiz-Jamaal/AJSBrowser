#!/bin/bash

# AWS Deployment Script for AJS Exam Browser Lambda
# This script deploys Lambda function and creates API Gateway

set -e

echo "🚀 AJS Exam Browser - AWS Lambda Deployment"
echo "============================================"
echo ""

# AWS Configuration
# Set these environment variables before running:
# export AWS_ACCESS_KEY_ID="your-access-key"
# export AWS_SECRET_ACCESS_KEY="your-secret-key"
AWS_REGION="us-east-1"
FUNCTION_NAME="AJSExamBrowserAPI"
ROLE_NAME="AJSExamBrowserLambdaRole"

echo "📍 Region: $AWS_REGION"
echo "📦 Function: $FUNCTION_NAME"
echo ""

# Step 1: Install dependencies
echo "📦 Step 1: Installing Lambda dependencies..."
cd lambda
npm install --production
cd ..
echo "✅ Dependencies installed"
echo ""

# Step 2: Create deployment package
echo "📦 Step 2: Creating deployment package..."
cd lambda
zip -r ../lambda-deploy.zip . -x "*.git*" "node_modules/.bin/*"
cd ..
echo "✅ Deployment package created: lambda-deploy.zip"
echo ""

# Step 3: Create IAM Role for Lambda
echo "🔐 Step 3: Creating IAM Role..."
aws iam create-role \
  --role-name $ROLE_NAME \
  --assume-role-policy-document '{
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
  }' \
  --region $AWS_REGION 2>/dev/null || echo "⚠️  Role already exists"

# Attach basic execution role
aws iam attach-role-policy \
  --role-name $ROLE_NAME \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole \
  --region $AWS_REGION 2>/dev/null || true

# Get role ARN
ROLE_ARN=$(aws iam get-role --role-name $ROLE_NAME --query 'Role.Arn' --output text)
echo "✅ IAM Role created: $ROLE_ARN"
echo ""

# Wait for role to propagate
echo "⏳ Waiting for IAM role to propagate (10 seconds)..."
sleep 10
echo ""

# Step 4: Create or Update Lambda Function
echo "☁️  Step 4: Deploying Lambda function..."
aws lambda create-function \
  --function-name $FUNCTION_NAME \
  --runtime nodejs18.x \
  --role $ROLE_ARN \
  --handler index.handler \
  --zip-file fileb://lambda-deploy.zip \
  --timeout 30 \
  --memory-size 512 \
  --region $AWS_REGION 2>/dev/null && echo "✅ Lambda function created" || {
    echo "⚠️  Function exists, updating code..."
    aws lambda update-function-code \
      --function-name $FUNCTION_NAME \
      --zip-file fileb://lambda-deploy.zip \
      --region $AWS_REGION
    echo "✅ Lambda function updated"
  }
echo ""

# Step 5: Create API Gateway
echo "🌐 Step 5: Creating API Gateway..."

# Create REST API
API_ID=$(aws apigatewayv2 create-api \
  --name "AJSExamBrowserAPI" \
  --protocol-type HTTP \
  --cors-configuration AllowOrigins="*",AllowMethods="*",AllowHeaders="*" \
  --region $AWS_REGION \
  --query 'ApiId' \
  --output text 2>/dev/null) || {
    # API might exist, get existing API ID
    API_ID=$(aws apigatewayv2 get-apis \
      --region $AWS_REGION \
      --query "Items[?Name=='AJSExamBrowserAPI'].ApiId | [0]" \
      --output text)
  }

echo "✅ API Gateway created: $API_ID"
echo ""

# Step 6: Create Integration
echo "🔗 Step 6: Creating Lambda integration..."
LAMBDA_ARN=$(aws lambda get-function \
  --function-name $FUNCTION_NAME \
  --region $AWS_REGION \
  --query 'Configuration.FunctionArn' \
  --output text)

INTEGRATION_ID=$(aws apigatewayv2 create-integration \
  --api-id $API_ID \
  --integration-type AWS_PROXY \
  --integration-uri $LAMBDA_ARN \
  --payload-format-version 2.0 \
  --region $AWS_REGION \
  --query 'IntegrationId' \
  --output text 2>/dev/null) || {
    INTEGRATION_ID=$(aws apigatewayv2 get-integrations \
      --api-id $API_ID \
      --region $AWS_REGION \
      --query 'Items[0].IntegrationId' \
      --output text)
  }

echo "✅ Integration created: $INTEGRATION_ID"
echo ""

# Step 7: Create Routes
echo "🛣️  Step 7: Creating API routes..."

routes=(
  "POST /api/student/verify"
  "POST /api/session/create"
  "GET /api/sessions"
  "POST /api/activity"
  "POST /api/screenshot"
  "POST /api/admin/login"
  "GET /api/admin/sessions"
)

for route in "${routes[@]}"; do
  method=$(echo $route | cut -d' ' -f1)
  path=$(echo $route | cut -d' ' -f2)
  
  aws apigatewayv2 create-route \
    --api-id $API_ID \
    --route-key "$method $path" \
    --target "integrations/$INTEGRATION_ID" \
    --region $AWS_REGION 2>/dev/null || echo "  ⚠️  Route already exists: $route"
done

echo "✅ Routes created"
echo ""

# Step 8: Grant API Gateway permission to invoke Lambda
echo "🔐 Step 8: Granting API Gateway permissions..."
aws lambda add-permission \
  --function-name $FUNCTION_NAME \
  --statement-id apigateway-invoke \
  --action lambda:InvokeFunction \
  --principal apigateway.amazonaws.com \
  --source-arn "arn:aws:execute-api:$AWS_REGION:*:$API_ID/*" \
  --region $AWS_REGION 2>/dev/null || echo "⚠️  Permission already exists"
echo "✅ Permissions granted"
echo ""

# Step 9: Create Stage and Deploy
echo "🚀 Step 9: Creating production stage..."
aws apigatewayv2 create-stage \
  --api-id $API_ID \
  --stage-name prod \
  --auto-deploy \
  --region $AWS_REGION 2>/dev/null || echo "⚠️  Stage already exists"

echo "✅ Production stage created"
echo ""

# Get API Endpoint
API_ENDPOINT=$(aws apigatewayv2 get-api \
  --api-id $API_ID \
  --region $AWS_REGION \
  --query 'ApiEndpoint' \
  --output text)

API_URL="${API_ENDPOINT}/prod"

echo ""
echo "============================================"
echo "✅ DEPLOYMENT SUCCESSFUL!"
echo "============================================"
echo ""
echo "📍 API Gateway URL: $API_URL"
echo ""
echo "🔗 Available Endpoints:"
echo "  POST   $API_URL/api/student/verify"
echo "  POST   $API_URL/api/session/create"
echo "  GET    $API_URL/api/sessions"
echo "  POST   $API_URL/api/activity"
echo "  POST   $API_URL/api/screenshot"
echo "  POST   $API_URL/api/admin/login"
echo "  GET    $API_URL/api/admin/sessions"
echo ""
echo "📝 Next Steps:"
echo "  1. Update index.html: Replace 'http://localhost:3000' with '$API_URL'"
echo "  2. Update adminlogin.html: Set API_URL to '$API_URL'"
echo "  3. Update admin.html: Set API_URL to '$API_URL'"
echo "  4. Test the API endpoints"
echo ""
echo "🧪 Test with:"
echo "  curl $API_URL/api/sessions"
echo ""
echo "📦 Cleanup:"
echo "  rm lambda-deploy.zip"
echo ""

# Save API URL to file
echo "$API_URL" > API_URL.txt
echo "✅ API URL saved to API_URL.txt"
echo ""
