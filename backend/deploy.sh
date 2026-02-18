#!/bin/bash

# Configuration
PROJECT_ID="solid-binder-487301-q0"
SERVICE_NAME="hailstorm-backend"
REGION="us-central1"

echo "🚀 Starting Cloud Shell Deployment for $PROJECT_ID..."

# 1. Set Project
gcloud config set project $PROJECT_ID

# 2. Enable APIs & Configure Registry
echo "Enabling APIs..."
gcloud services enable run.googleapis.com cloudbuild.googleapis.com firestore.googleapis.com artifactregistry.googleapis.com

# Create Artifact Registry if it doesn't exist (Fixes GCR permission error)
echo "📦 Configuring Artifact Registry..."
gcloud artifacts repositories create gcr.io \
    --repository-format=docker \
    --location=us \
    --description="Docker repository" \
    || echo "Registry might already exist, continuing..."

# 3. Build Container
echo "🏗️ Building Container..."
# Use gcloud builds submit
gcloud builds submit --tag gcr.io/$PROJECT_ID/$SERVICE_NAME

# 4. Deploy to Cloud Run
echo "☁️ Deploying to Cloud Run..."
gcloud run deploy $SERVICE_NAME \
  --image gcr.io/$PROJECT_ID/$SERVICE_NAME \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --set-env-vars SENDGRID_API_KEY="$SENDGRID_API_KEY" 

echo "✅ Deployment Complete! Copy the URL above."
