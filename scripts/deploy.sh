#!/usr/bin/env bash
# Build and deploy to S3, then invalidate the CloudFront cache.
#
# Usage: ./scripts/deploy.sh <stack-name>
# Example: ./scripts/deploy.sh sorting

set -euo pipefail

STACK_NAME="${1:?Usage: $0 <stack-name>}"
DIST_DIR="dist"

echo "Fetching stack outputs for: $STACK_NAME"

BUCKET_NAME=$(aws cloudformation describe-stacks \
  --stack-name "$STACK_NAME" \
  --query "Stacks[0].Outputs[?OutputKey=='BucketName'].OutputValue" \
  --output text)

DISTRIBUTION_ID=$(aws cloudformation describe-stacks \
  --stack-name "$STACK_NAME" \
  --query "Stacks[0].Outputs[?OutputKey=='DistributionId'].OutputValue" \
  --output text)

echo "Bucket:       $BUCKET_NAME"
echo "Distribution: $DISTRIBUTION_ID"

echo "Building..."
yarn build

echo "Syncing $DIST_DIR/ to s3://$BUCKET_NAME ..."
aws s3 sync "$DIST_DIR/" "s3://$BUCKET_NAME/" \
  --delete \
  --cache-control "max-age=31536000,immutable" \
  --exclude "index.html"

# index.html gets a short cache so users always get the latest entry point
aws s3 cp "$DIST_DIR/index.html" "s3://$BUCKET_NAME/index.html" \
  --cache-control "no-cache"

echo "Invalidating CloudFront cache..."
aws cloudfront create-invalidation \
  --distribution-id "$DISTRIBUTION_ID" \
  --paths "/*"

echo ""
echo "Deployed successfully."
