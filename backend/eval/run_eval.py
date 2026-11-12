import os
import sys

current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

import time
import json
import subprocess
import numpy as np
from datasets import load_dataset
from app.engine import GrammarEngine
from app.checkers.spelling import SpellingChecker
from app.checkers.articles import ArticleChecker
from app.checkers.grammar_ml import GrammarModelChecker

current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

def apply_replacements_right_to_left(text: str, issues: list) -> str:
    sorted_issues = sorted(issues, key=lambda i: i.start, reverse=True)
    res = text
    for issue in sorted_issues:
        if issue.replacements:
            rep = issue.replacements[0]
            res = res[:issue.start] + rep + res[issue.end:]
    return res

def run_evaluation(split="validation"):
    print(f"Loading JFLEG dataset ({split} split)...")
    dataset = load_dataset("jhu-clsp/jfleg", split=split)
    
    sources = []
    references = [[] for _ in range(4)]
    
    for item in dataset:
        sources.append(item["sentence"].strip())
        corrs = item["corrections"]
        for i in range(4):
            references[i].append(corrs[i].strip() if i < len(corrs) else corrs[0].strip())

    os.makedirs("backend/eval/temp", exist_ok=True)
    orig_path = "backend/eval/temp/orig.txt"
    hyp_path = "backend/eval/temp/hyp.txt"
    ref_paths = [f"backend/eval/temp/ref{i}.txt" for i in range(4)]
    
    with open(orig_path, "w", encoding="utf-8") as f:
        f.write("\n".join(sources) + "\n")
        
    for i in range(4):
        with open(ref_paths[i], "w", encoding="utf-8") as f:
            f.write("\n".join(references[i]) + "\n")

    configs = {
        "Spelling Only": [SpellingChecker()],
        "Spelling + Articles": [SpellingChecker(), ArticleChecker()],
        "ML Only": [GrammarModelChecker()],
        "Full Engine": [SpellingChecker(), ArticleChecker(), GrammarModelChecker()]
    }

    metrics_output = {}
    latencies = []

    for name, checkers in configs.items():
        print(f"\nEvaluating configuration: {name}")
        engine = GrammarEngine(checkers=checkers)
        
        hypotheses = []
        for src in sources:
            t0 = time.time()
            issues = engine.analyze(src)
            t1 = time.time()
            latencies.append((t1 - t0) * 1000)
            
            hyp = apply_replacements_right_to_left(src, issues)
            hypotheses.append(hyp)
            
        with open(hyp_path, "w", encoding="utf-8") as f:
            f.write("\n".join(hypotheses) + "\n")
            
        hyp_m2 = f"backend/eval/temp/{name.lower().replace(' ', '_')}_hyp.m2"
        ref_m2 = "backend/eval/temp/ref.m2"
        
        subprocess.run(["errant_parallel", "-orig", orig_path, "-cor", hyp_path, "-out", hyp_m2], check=True)
        if not os.path.exists(ref_m2):
            subprocess.run([
                "errant_parallel", "-orig", orig_path, 
                "-cor", ref_paths[0], ref_paths[1], ref_paths[2], ref_paths[3], 
                "-out", ref_m2
            ], check=True)
            
        comp_res = subprocess.run(["errant_compare", "-hyp", hyp_m2, "-ref", ref_m2], capture_output=True, text=True, check=True)
        print(comp_res.stdout)
        metrics_output[name] = comp_res.stdout

    latencies = np.array(latencies)
    latency_stats = {
        "median_ms": float(np.median(latencies)),
        "p95_ms": float(np.percentile(latencies, 95))
    }
    print(f"\nLatency Stats -> Median: {latency_stats['median_ms']:.2f}ms | P95: {latency_stats['p95_ms']:.2f}ms")

    with open("backend/eval/results.json", "w", encoding="utf-8") as f:
        json.dump({"metrics": metrics_output, "latency": latency_stats}, f, indent=2)
    print("\nEvaluation complete! Results saved to backend/eval/results.json")

if __name__ == "__main__":
    run_evaluation()