# Use full Python image to ensure all C++ build tools are present for Firestore/GRPC
FROM python:3.11

# Set environment variables
# PYTHONUNBUFFERED=1 ensures console output is not buffered by Docker
ENV PYTHONUNBUFFERED=1

# Set working directory
WORKDIR /app

# Copy requirements and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the code
COPY . .

# Run the application using Uvicorn
# Cloud Run automatically sets the PORT environment variable (default 8080)
CMD exec uvicorn main:app --host 0.0.0.0 --port ${PORT:-8080}
