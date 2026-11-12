# backend/scripts/measure_perf.py
import time
import psutil
import os
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM
import torch

def measure():
    process = psutil.Process(os.getpid())
    
    # Baseline memory before loading
    mem_before = process.memory_info().rss / (1024 * 1024)
    print(f"Memory before loading: {mem_before:.2f} MB")

    print("Loading model and tokenizer...")
    start_load = time.time()
    tokenizer = AutoTokenizer.from_pretrained("Unbabel/gec-t5_small")
    model = AutoModelForSeq2SeqLM.from_pretrained("Unbabel/gec-t5_small")
    model.eval()
    load_time = time.time() - start_load
    print(f"Model load time: {load_time:.2f} seconds")

    # Memory after loading
    mem_after = process.memory_info().rss / (1024 * 1024)
    model_mem = mem_after - mem_before
    print(f"Memory after loading model: {mem_after:.2f} MB (Model footprint: ~{model_mem:.2f} MB)")

    # Latency: Cold sentence inference
    sentence = "gec: She go to school yesterday."
    inputs = tokenizer(sentence, return_tensors="pt")
    
    start_cold = time.time()
    with torch.inference_mode():
        _ = model.generate(**inputs, max_new_tokens=128, num_beams=2)
    cold_latency = (time.time() - start_cold) * 1000
    print(f"Cold sentence latency: {cold_latency:.2f} ms")

    # Latency: Cached-style simulation (running inference again on same inputs)
    start_cached = time.time()
    with torch.inference_mode():
        _ = model.generate(**inputs, max_new_tokens=128, num_beams=2)
    cached_latency = (time.time() - start_cached) * 1000
    print(f"Cached/Repeated sentence inference latency: {cached_latency:.2f} ms")

    # Latency: 5-sentence paragraph
    paragraph = (
        "gec: She go to school yesterday. "
        "He have a apple. "
        "They was playing football. "
        "I can can do this. "
        "She don't likes apples."
    )
    para_inputs = tokenizer(paragraph, return_tensors="pt", truncation=True, max_length=256)
    
    start_para = time.time()
    with torch.inference_mode():
        _ = model.generate(**para_inputs, max_new_tokens=256, num_beams=2)
    para_latency = (time.time() - start_para) * 1000
    print(f"5-sentence paragraph latency: {para_latency:.2f} ms")

    # Check Hugging Face cache size for download size approximation
    hf_cache_dir = os.path.expanduser("~/.cache/huggingface/hub")
    if os.path.exists(hf_cache_dir):
        total_size = sum(
            os.path.getpath(os.path.join(dirpath, filename)) 
            if hasattr(os, 'getpath') else os.path.getsize(os.path.join(dirpath, filename))
            for dirpath, _, filenames in os.walk(hf_cache_dir)
            for filename in filenames
        )
        print(f"Approximate Model Download Size on disk: {total_size / (1024 * 1024):.2f} MB")

if __name__ == "__main__":
    measure()