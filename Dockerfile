# Production image: build from repository root (same pattern as cloud `api/Dockerfile`).
# Runtime listens on PORT (default 8000) for parity with Quantlix API deployments.
#
# Build:
#   docker build --platform linux/amd64 -t quantlix-assistant:latest -f Dockerfile .
#
# Run locally:
#   docker run --rm -p 8000:8000 -e DATABASE_URL=... -e VOYAGE_API_KEY=... \
#     -e QUANTLIX_API_KEY=... -e QUANTLIX_DEPLOYMENT_ID=... quantlix-assistant:latest

FROM python:3.12-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app \
    PORT=8000

RUN apt-get update && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --create-home --system --uid 10001 --shell /usr/sbin/nologin appuser

WORKDIR /app

COPY backend/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

COPY backend/app /app/app

RUN chown -R appuser:appuser /app

USER appuser

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD curl -fsS "http://127.0.0.1:${PORT}/health" >/dev/null || exit 1

CMD ["sh", "-c", "exec uvicorn app.main:app --host 0.0.0.0 --port \"${PORT}\""]
