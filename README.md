# GrammarAI - **An open-source alternative to Grammarly.** 

[![Live demo](https://img.shields.io/badge/Live_demo-grammar--ai--sandy.vercel.app-2563eb?style=for-the-badge)](https://grammar-ai-sandy.vercel.app/)

<p align="center">
<img
src="https://github.com/user-attachments/assets/e3413c5d-f549-4f5a-8ddd-fa0a0978e32a"
width="1000"
alt="GrammarAI demo"
/>
</p>

> The first visit can take up to a minute while the server wakes up. The backend scales to zero when nobody is using it, and the status bar tells you when that is happening.

## Why I built this

I wanted to create a meaningful open-source project. Also wanted to build a complex production level application by choosing models, measuring them properly, then shipping the result on a free tier. The part I enjoyed most was turning a model that rewrites a whole sentence into precise, clickable suggestions with exact character positions.

## What it does

- Underlines mistakes live as you type, with one colour per category (spelling, grammar, punctuation).
- Hover a word (or tap it on a phone) to see an explanation and one-click fixes. Applying a fix keeps your cursor where it was.
- Three checkers work together: dictionary spelling, linguistic rules, and a small neural grammar model.
- Never sends a request per keystroke, and never shows results for text you have already changed.
- Your text is not stored, and it is not written to the logs.

## System design

<p align="center">
<img
src="https://github.com/user-attachments/assets/ff042cd8-a401-42f1-87a8-d2a8a745e11a"
width="1000"
alt="GrammarAI system design"
/>
</p>


## How the checking works

| Layer | What it does | Built with |
|---|---|---|
| Spelling | Edit-distance search over an 82,000-word frequency dictionary, keeps your capitalisation, skips names and acronyms | SymSpell |
| Rules | Decides a vs an by how the next word *sounds* ("an hour", "a university") using a pronunciation dictionary | spaCy, CMU Pronouncing Dictionary |
| Grammar | A small sequence-to-sequence model rewrites each sentence, then a diff turns the rewrite into individual edits with exact positions | T5-small grammar-correction model, PyTorch |

When two checkers flag the same words, the engine keeps the higher-priority one (spelling, then rules, then the model) and merges the suggestions if the ranges are identical.

## Does it work? Evaluation

I measured the engine with [ERRANT](https://github.com/chrisjbryant/errant) on the JFLEG benchmark. Each configuration applies its top suggestion for every issue, then the result is scored against the human corrections (span-based correction).

| Configuration | Precision | Recall | F0.5 |
|---|---|---|---|
| Spelling only | 0.604 | 0.164 | 0.393 |
| Spelling + articles | 0.601 | 0.165 | 0.394 |
| Grammar model only | 0.641 | 0.337 | 0.543 |
| **Full engine** | 0.614 | 0.373 | **0.544** |

What I take from it:

- The model is what moves the score: about 15 F0.5 points over the rule-based checkers alone.
- Full engine versus model only is a tie on F0.5 (0.544 vs 0.543), which is within noise. I ship the full engine because spelling and article fixes are instant and explainable, which the metric does not capture.
- JFLEG's reference corrections are fluency rewrites, not minimal fixes, so recall looks low against it. That is a property of the benchmark.
- The model's two safety settings (reject sentences it rewrote too heavily, cap edits per sentence) were chosen by hand and not tuned on the data.

Full details and method are in [`backend/eval/EVALUATION.md`](backend/eval/EVALUATION.md).

## Decisions and trade-offs

- **Precision over recall.** A false alarm costs more trust than a missed error, so every checker skips what it is unsure about and F0.5 is the headline metric.
- **Offsets are the hard part.** Python counts characters by code point and JavaScript by UTF-16 unit, so any text containing an emoji would shift every underline after it. The API converts once at the boundary, and tests cover it.
- **Stale results are ignored.** The editor debounces, cancels in-flight requests, and checks that the text at an issue's position still matches before drawing it or applying a fix.
- **Real components, small enough to host for free.** A 60M-parameter model on CPU, baked into the Docker image so a cold start never downloads anything. The model's weights are about 242 MB and loading it takes the container roughly 50 seconds when cold.
- **Protecting a public demo.** Rate limiting, a CORS allow-list, an input size cap, a single model instance behind a lock, and logs that record sizes and timings only.

## Tech stack

| Area | Tools |
|---|---|
| Frontend | React, TypeScript, Tailwind CSS, Vite, Vitest |
| Backend | Python, FastAPI, Pydantic, spaCy, SymSpell, PyTorch, Hugging Face Transformers |
| Evaluation | ERRANT, JFLEG |
| Delivery | Docker, AWS, Vercel |
| Testing | pytest, Vitest |

## Run it locally

You need Python 3.11+ and Node 20+.

**Backend** (PowerShell; on macOS/Linux use `source .venv/bin/activate`)

```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install torch --index-url https://download.pytorch.org/whl/cpu
pip install -r requirements.txt
uvicorn app.main:app --reload
```

The first start downloads the grammar model (about 240 MB) and takes a while to load.

**Frontend**

```bash
cd frontend
npm install
npm run dev
```

The frontend reads the API address from `VITE_API_URL` (default `http://127.0.0.1:8000`).

**Tests**

```bash
cd backend && pytest -m "not slow"     # add "-m slow" for the tests that load the real model
cd frontend && npm test
```

**Docker**

```bash
cd backend
docker build -t grammarai-api .
docker run --rm -p 8080:8080 -m 1g --cpus 1 grammarai-api
```

## Project structure

```
backend/
  app/
    main.py            API, CORS, rate limiting, startup
    engine.py          runs the checkers, resolves overlaps
    diffing.py         turns a rewritten sentence into edits
    offsets.py         code point to UTF-16 offset conversion
    checkers/          spelling, articles, grammar model
  eval/                ERRANT evaluation harness and results
  tests/
frontend/
  src/
    components/        Editor, HighlightLayer, SuggestionCard
    hooks/             debounced, cancellable grammar check
    utils/             segments, hit testing, apply-fix
```

## Limitations and what I would do next

- English only, and a 5,000 character limit per check.
- The a/an rule is accurate but rare in real text, so it adds little to the score.
- Contractions written without an apostrophe (like "dont") are not handled well yet.
- A cold start takes up to a minute. A pre-built SymSpell index and a keep-warm ping are the next things I would try.
- The grammar model gives generic explanations. Classifying edits by error type would make them more useful.

## Credits

[SymSpell](https://github.com/wolfgarbe/SymSpell) and [symspellpy](https://github.com/mammothb/symspellpy), [spaCy](https://spacy.io), the [CMU Pronouncing Dictionary](http://www.speech.cs.cmu.edu/cgi-bin/cmudict), [Unbabel's gec-t5_small](https://huggingface.co/Unbabel/gec-t5_small), [ERRANT](https://github.com/chrisjbryant/errant) and the [JFLEG](https://github.com/keisks/jfleg) benchmark. See each project for its own licence.

## Licence

See [LICENSE](LICENSE).
