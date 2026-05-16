# Deploying the Backend to Google Cloud Run

The backend now includes `backend/Dockerfile` for Cloud Run.

## Prerequisites

- Google Cloud project with billing enabled.
- Artifact Registry and Cloud Run APIs enabled.
- `gcloud` authenticated locally.

## Build and Push

From the repo root:

```bash
gcloud artifacts repositories create asaaniyat \
  --repository-format=docker \
  --location=asia-south1

gcloud builds submit backend \
  --tag asia-south1-docker.pkg.dev/PROJECT_ID/asaaniyat/asaaniyat-backend:latest
```

Replace `PROJECT_ID` with your Google Cloud project id.

## Deploy

```bash
gcloud run deploy asaaniyat-backend \
  --image asia-south1-docker.pkg.dev/PROJECT_ID/asaaniyat/asaaniyat-backend:latest \
  --region asia-south1 \
  --allow-unauthenticated \
  --port 8080 \
  --set-env-vars NODE_ENV=production,DEFAULT_CITY=Karachi,RAG_TOP_K=4
```

Add secrets instead of plain env vars for keys:

```bash
gcloud secrets create MAPS_API_KEY --data-file=-
gcloud run services update asaaniyat-backend \
  --region asia-south1 \
  --set-secrets MAPS_API_KEY=MAPS_API_KEY:latest
```

## Mobile Configuration

Point Expo to the deployed backend:

```bash
EXPO_PUBLIC_API_BASE_URL=https://YOUR_CLOUD_RUN_URL npx expo start
```

## Runtime Notes

Cloud Run containers are ephemeral. Agent traces written to `backend/logs` are useful during a live container session but should be exported to Cloud Logging or Cloud Storage for long-term retention.
