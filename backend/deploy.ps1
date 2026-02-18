# Deployment Script for Project Hailstorm V3
# Usage: .\deploy.ps1

$SERVICE_NAME = "hailstorm-backend"
$REGION = "us-central1"

# 1. Configuration
$PROJECT_ID = "solid-binder-487301-q0" 
$SERVICE_NAME = "hailstorm-backend"
$REGION = "us-central1"

Write-Host "✅ Using Project: $PROJECT_ID"

# 1. Enable Services (First Run Only - can be commented out later)
# Write-Host "Enabling APIs..."
# gcloud services enable run.googleapis.com cloudbuild.googleapis.com firestore.googleapis.com

# 2. Build Container
Write-Host "🏗️ Building Container..."
gcloud builds submit --tag gcr.io/$PROJECT_ID/$SERVICE_NAME

# 3. Deploy to Cloud Run
Write-Host "☁️ Deploying to Cloud Run..."
gcloud run deploy $SERVICE_NAME `
  --image gcr.io/$PROJECT_ID/$SERVICE_NAME `
  --platform managed `
  --region $REGION `
  --allow-unauthenticated `
  --set-env-vars SENDGRID_API_KEY="$env:SENDGRID_API_KEY" 

Write-Host "✅ Deployment Complete!"
