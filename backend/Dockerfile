FROM python:3.14-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    HF_HOME=/models \
    TORCH_NUM_THREADS=1

WORKDIR /app

# 1. Dependencies. This layer is rebuilt only when requirements.txt changes.
#    CPU-only PyTorch comes first: the default wheel drags in gigabytes of CUDA libraries.
COPY requirements.txt .
RUN pip install torch --index-url https://download.pytorch.org/whl/cpu \
 && pip install -r requirements.txt

# 2. Bake the model into the image so a cold start never downloads anything.
RUN python -c "from transformers import AutoTokenizer, AutoModelForSeq2SeqLM; \
AutoTokenizer.from_pretrained('Unbabel/gec-t5_small'); \
AutoModelForSeq2SeqLM.from_pretrained('Unbabel/gec-t5_small')"

# 3. Application code. Changing code rebuilds only from here, so it takes seconds.
COPY app ./app

# From here on the app must never reach out to the Hugging Face Hub.
ENV HF_HUB_OFFLINE=1

# Run as a normal user, not root.
RUN useradd --create-home appuser && chown -R appuser:appuser /app /models
USER appuser

EXPOSE 8080

# Cloud Run injects $PORT (8080 by default). `exec` makes uvicorn receive shutdown signals directly.
CMD ["sh", "-c", "exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8080}"]