FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Install deps
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy app code
COPY . .

# Cloud Run listens on $PORT
CMD exec gunicorn -k uvicorn.workers.UvicornWorker -w 1 -b :$PORT app.main:app
