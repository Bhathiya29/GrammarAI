FROM python:3.14.5-slim

# AWS Lambda Web Adapter: lets this same web app run on Lambda. Outside Lambda it does nothing.
COPY --from=public.ecr.aws/awsguru/aws-lambda-adapter:1.0.0 /lambda-adapter /opt/extensions/lambda-adapter

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    HF_HOME=/models \
    TORCH_NUM_THREADS=2 \
    PORT=8080 \
    AWS_LWA_PORT=8080 \
    AWS_LWA_READINESS_CHECK_PATH=/health \
    AWS_LWA_ASYNC_INIT=true

WORKDIR /app

# 1. Dependencies (CPU-only PyTorch first)
COPY requirements.txt .
RUN pip install torch --index-url https://download.pytorch.org/whl/cpu \
 && pip install -r requirements.txt

# 2. Bake the model into the image so a cold start never downloads anything
RUN python -c "from transformers import AutoTokenizer, AutoModelForSeq2SeqLM; \
AutoTokenizer.from_pretrained('Unbabel/gec-t5_small'); \
AutoModelForSeq2SeqLM.from_pretrained('Unbabel/gec-t5_small')"

# 3. Application code
COPY app ./app

# The app must never reach out to the Hugging Face Hub at runtime
ENV HF_HUB_OFFLINE=1

RUN useradd --create-home appuser && chown -R appuser:appuser /app /models
USER appuser

EXPOSE 8080

CMD ["sh", "-c", "exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8080}"]