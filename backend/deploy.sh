#!/bin/bash

# Configuration
PROJECT_ID="solid-binder-487301-q0"
SERVICE_NAME="hailstorm-backend"
REGION="us-central1"

echo "🚀 Starting Cloud Shell Deployment for $PROJECT_ID..."

# 1. Set Project
gcloud config set project $PROJECT_ID

# 2. Enable APIs & Configure Artifact Registry
echo "Enabling APIs..."
gcloud services enable run.googleapis.com cloudbuild.googleapis.com firestore.googleapis.com artifactregistry.googleapis.com

# Define Artifact Registry URL
REPO_NAME="containers"
IMAGE_URL="us-central1-docker.pkg.dev/$PROJECT_ID/$REPO_NAME/$SERVICE_NAME"

# Create Artifact Registry (Idempotent)
echo "📦 Configuring Artifact Registry..."
gcloud artifacts repositories create $REPO_NAME \
    --repository-format=docker \
    --location=$REGION \
    --description="Docker repository for Hailstorm" \
    || echo "Registry likely exists, continuing..."

# 3. Build Container (using Artifact Registry)
echo "🏗️ Building Container..."
gcloud builds submit --tag $IMAGE_URL

# 4. Deploy to Cloud Run
echo "☁️ Deploying to Cloud Run..."
gcloud run deploy $SERVICE_NAME \
  --image $IMAGE_URL \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --set-env-vars SENDGRID_API_KEY="$SENDGRID_API_KEY" 

echo "✅ Deployment Complete! Copy the URL above."
