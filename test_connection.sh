#!/usr/bin/env bash
# test_connection.sh — verify Otari API connectivity
set -e

# Load .env variables
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
  echo "✅ .env loaded"
else
  echo "❌ .env not found. Copy .env.example and fill in your key."
  exit 1
fi

echo ""
echo "=== 1. Python client ping (gpt-4o-mini) ==="
python backend/otari_client.py

echo ""
echo "=== 2. GET /health on Otari base URL ==="
BASE="${OTARI_BASE_URL:-https://api.otari.ai/v1}"
HEALTH_URL="${BASE%/v1}/health"   # strip /v1 to hit root health endpoint
echo "Hitting: $HEALTH_URL"

curl -s -w "\nHTTP status: %{http_code}\n" \
  -H "Authorization: Bearer $OTARI_API_KEY" \
  "$HEALTH_URL" | head -40

echo ""
echo "Done."
