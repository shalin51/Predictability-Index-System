FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PREDICTION_HOST=0.0.0.0 \
    PREDICTION_PORT=4100

WORKDIR /app

COPY pyproject.toml README.md ./
COPY src ./src
RUN pip install --no-cache-dir .

RUN useradd --create-home --uid 10001 prediction \
    && mkdir -p /app/.models \
    && chown -R prediction:prediction /app
USER prediction

EXPOSE 4100

CMD ["uvicorn", "prediction_server.main:app", "--host", "0.0.0.0", "--port", "4100"]

