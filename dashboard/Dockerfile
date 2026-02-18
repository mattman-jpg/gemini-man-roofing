# Base Image
FROM python:3.10-slim

# Working Directory
WORKDIR /app

# Copy Requirements
COPY requirements.txt .

# Install Dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy App Code
COPY . .

# Expose Port (Streamlit default is 8501)
EXPOSE 8080

# Environment Variables
ENV PYTHONUNBUFFERED=1

# Run Command
CMD ["streamlit", "run", "app.py", "--server.port=8080", "--server.address=0.0.0.0", "--server.enableCORS=false", "--server.enableXsrfProtection=false"]
