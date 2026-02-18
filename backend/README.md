# Project Hailstorm V3: Backend Documentation

This directory contains the Python/FastAPI backend for the "Infinite Scale" architecture.

## 📂 Files

* `main.py`: The application logic. Receives leads at `/submit-lead` and triggers emails.
* `Dockerfile`: Instructions for Docker/Cloud Run to run the app.
* `requirements.txt`: List of libraries (FastAPI, SendGrid, Firestore).
* `deploy.ps1`: (Optional) Helper script for manual deployment.

## 🚀 Deployment Strategy: "GitOps" (Recommended)

Since local CLI tools are restricted, we will deploy via GitHub.

### Step 1: Push to GitHub

1. Open **GitHub Desktop** (or your preferred Git tool).
2. Add this `cloud_run_backend` folder as a local repository.
3. Publish the repository to GitHub (Name it `hailstorm-backend`).

### Step 2: Connect to Google Cloud

1. Go to **[Google Cloud Run Console](https://console.cloud.google.com/run)**.
2. Click **Create Service**.
3. Select **"Continuously deploy new revisions from a source repository"**.
4. Click **"Set up with Cloud Build"** and authorize GitHub.
5. Select your new `hailstorm-backend` repository.
6. Click **Save** and then **Create**.

### Result

Google Cloud will now watch your GitHub repo. Every time you push a change to the code, it will automatically build and deploy the new version.

## 🧪 How to Test Locally

1. Run `pip install -r requirements.txt`.
2. Run `uvicorn main:app --reload`.
3. Open `http://localhost:8000/docs` to see the Interactive Swagger UI.
