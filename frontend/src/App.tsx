import { useState, useEffect, useMemo, type ReactNode } from 'react';
import { Editor } from './components/Editor';
import { useGrammarCheck } from './hooks/useGrammarCheck';
import { CATEGORY_META } from './utils/categories';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
const MAX_CHARS = 5000;
const REPO_URL = 'https://github.com/Bhathiya29/GrammarAI';
const REPO_IS_LIVE = true;
const AUTHOR_NAME = 'Bhathiya Dissanayake'; 
const AUTHOR_URL = 'https://linkedin.com/in/bhathiya-dissanayake'; 

const EXAMPLE_TEXT =
  'Hi team, I recieve your mesage yesterday and I think it is a excellent idea. ' +
  'She go to the planning meeting every week, and we was happy with the result. ' +
  'Please send me the agenda befor Friday.';

const TECH = [
  'Python',
  'FastAPI',
  'React',
  'TypeScript',
  'Docker',
  'AWS',
  'Cursor',
  'Claude Code',
  'spaCy',
  'SymSpell',
  'CMUdict',
  'T5-small',
  'PyTorch',
  'Hugging Face',
];

const HOW_IT_WORKS = [
  {
    step: '01',
    title: 'Spelling',
    tech: 'SymSpell',
    description:
      'Edit-distance search over an 82,000-word frequency dictionary, with your capitalisation preserved.',
  },
  {
    step: '02',
    title: 'Rules',
    tech: 'spaCy + CMUdict',
    description:
      'Checks a and an against how words actually sound, using the CMU Pronouncing Dictionary.',
  },
  {
    step: '03',
    title: 'Grammar',
    tech: 'T5-small',
    description:
      'A small sequence-to-sequence model rewrites each sentence, and a diff turns the changes into precise suggestions.',
  },
];

type ServerState = 'waking' | 'ready' | 'down';

/* ---------- Logo and icons ---------- */

// Two lines of text with a wavy underline: the squiggle is what the product does
function LogoMark({ className = 'h-8 w-8' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="grammarai-mark" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3b82f6" />
          <stop offset="1" stopColor="#1d4ed8" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="8" fill="url(#grammarai-mark)" />
      <path
        d="M8 10h16M8 16h10"
        fill="none"
        stroke="#fff"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <path
        d="M8 22q2-3 4 0t4 0t4 0"
        fill="none"
        stroke="#fff"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Icon({ className = 'h-4 w-4', children }: { className?: string; children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

function GithubIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
}

const SparkleIcon = () => (
  <Icon>
    <path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8L12 3z" />
    <path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15z" />
  </Icon>
);

const CopyIcon = () => (
  <Icon>
    <rect x="9" y="9" width="11" height="11" rx="2" />
    <path d="M5 15V6a2 2 0 0 1 2-2h9" />
  </Icon>
);

const CheckIcon = () => (
  <Icon>
    <path d="M5 13l4 4L19 7" />
  </Icon>
);

const TrashIcon = () => (
  <Icon>
    <path d="M3 6h18" />
    <path d="M8 6V4h8v2" />
    <path d="M19 6l-1 14H6L5 6" />
  </Icon>
);

/* ---------- Shared button styles ---------- */

const secondaryBtn =
  'inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm ' +
  'font-medium text-slate-700 shadow-xs transition hover:border-slate-300 hover:bg-slate-50 ' +
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 ' +
  'disabled:cursor-not-allowed disabled:opacity-40';

const primaryBtn =
  'inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3.5 py-1.5 text-sm font-semibold ' +
  'text-white shadow-xs transition hover:bg-blue-700 focus:outline-none ' +
  'focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2';

const darkBtn =
  'inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3.5 py-1.5 text-sm font-semibold ' +
  'text-white shadow-xs transition hover:bg-slate-700 focus:outline-none ' +
  'focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2';

function App() {
  const [text, setText] = useState('');
  const [serverState, setServerState] = useState<ServerState>('waking');
  const [copied, setCopied] = useState(false);

  // Warm-up ping on mount. Also tells us whether the backend is still cold-starting.
  useEffect(() => {
    let cancelled = false;
    fetch(`${API_URL}/health`)
      .then((res) => {
        if (!cancelled) setServerState(res.ok ? 'ready' : 'down');
      })
      .catch(() => {
        if (!cancelled) setServerState('down');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const { issues: fetchedIssues, status } = useGrammarCheck(text, 500);
  const [localIssues, setLocalIssues] = useState(fetchedIssues);

  // Sync fetched issues into local state when new backend results arrive
  useEffect(() => {
    setLocalIssues(fetchedIssues);
  }, [fetchedIssues]);

  const counts = useMemo(() => {
    const result: Record<string, number> = {};
    for (const issue of localIssues) {
      result[issue.category] = (result[issue.category] ?? 0) + 1;
    }
    return result;
  }, [localIssues]);

  const overLimit = text.length > MAX_CHARS;
  const nearLimit = text.length > MAX_CHARS * 0.9;

  let statusLabel: string;
  let dotClass: string;
  if (overLimit) {
    statusLabel = `Text is over the ${MAX_CHARS.toLocaleString()} character limit`;
    dotClass = 'bg-red-500';
  } else if (status === 'error') {
    statusLabel = "Couldn't reach the server";
    dotClass = 'bg-red-500';
  } else if (status === 'checking') {
    statusLabel =
      serverState === 'waking'
        ? 'Waking up the server, the first check can take a few seconds…'
        : 'Checking…';
    dotClass = 'bg-amber-400 animate-pulse';
  } else if (text.trim() === '') {
    statusLabel = 'Start typing, or try the example';
    dotClass = 'bg-slate-300';
  } else if (localIssues.length === 0) {
    statusLabel = 'No issues found';
    dotClass = 'bg-emerald-500';
  } else {
    statusLabel = `${localIssues.length} issue${localIssues.length === 1 ? '' : 's'} found`;
    dotClass = 'bg-emerald-500';
  }

  const serverDot =
    serverState === 'ready'
      ? 'bg-emerald-500'
      : serverState === 'waking'
        ? 'bg-amber-400 animate-pulse'
        : 'bg-red-500';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard can be blocked by the browser; nothing useful to do here
    }
  };

  const repoLinkProps = REPO_IS_LIVE ? { target: '_blank', rel: 'noreferrer' } : {};

  return (
    <div className="page-bg flex min-h-screen flex-col text-slate-800">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-6">
          <a href="/" className="flex items-center gap-2.5" aria-label="GrammarAI home">
            <LogoMark />
            <span className="text-[19px] font-bold tracking-[-0.03em] text-slate-900">
              Grammar<span className="text-blue-600">AI</span>
            </span>
          </a>

          <a href={REPO_URL} {...repoLinkProps} className={darkBtn}>
            <GithubIcon />
            Check repo
          </a>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 px-6 pb-16">
        {/* Hero: headline, one-line subheading, then the tools */}
        <section className="pb-8 pt-10 text-center sm:pt-14">
          <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 shadow-xs">
            <span className={`h-2 w-2 rounded-full ${serverDot}`} />
            Not Vibe Coded, Check Repo (Running Live on AWS)
          </span>

          <h1 className="mx-auto mt-5 max-w-2xl text-4xl font-bold tracking-[-0.03em] text-slate-900 sm:text-5xl sm:leading-[1.08]">
            Your open-source alternative to <span className="text-emerald-600">Grammarly</span>
          </h1>


          <p className="mt-7 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
            I have shipped this in approx 15 hours with
          </p>
          <div className="mx-auto mt-3 flex max-w-2xl flex-wrap items-center justify-center gap-2">
            {TECH.map((tech) => (
              <span
                key={tech}
                className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 shadow-xs"
              >
                {tech}
              </span>
            ))}
          </div>
        </section>

        {/* Editor card */}
        <section className="surface-card rounded-2xl border border-slate-200 bg-white transition focus-within:border-blue-300 focus-within:ring-4 focus-within:ring-blue-500/10">
          {/* Toolbar */}
          <div className="flex items-center justify-between rounded-t-2xl border-b border-slate-100 px-4 py-3">
            <button className={primaryBtn} onClick={() => setText(EXAMPLE_TEXT)}>
              <SparkleIcon />
              Try an example
            </button>
            <div className="flex items-center gap-2">
              <button className={secondaryBtn} onClick={handleCopy} disabled={!text}>
                {copied ? <CheckIcon /> : <CopyIcon />}
                {copied ? 'Copied' : 'Copy'}
              </button>
              <button className={secondaryBtn} onClick={() => setText('')} disabled={!text}>
                <TrashIcon />
                Clear
              </button>
            </div>
          </div>

          {/* Editor with highlight layer and suggestion popovers */}
          <Editor
            text={text}
            onChange={setText}
            issues={localIssues}
            onIssuesUpdate={setLocalIssues}
          />

          {/* Status bar */}
          <div className="flex items-center justify-between rounded-b-2xl border-t border-slate-100 bg-slate-50/70 px-4 py-3">
            <div className="flex items-center gap-2" role="status" aria-live="polite">
              <span className={`h-2 w-2 rounded-full ${dotClass}`} />
              <span className="text-xs font-medium text-slate-600">{statusLabel}</span>
            </div>
            <span
              className={`text-xs tabular-nums ${
                overLimit
                  ? 'font-semibold text-red-600'
                  : nearLimit
                    ? 'text-amber-600'
                    : 'text-slate-400'
              }`}
            >
              {text.length.toLocaleString()} / {MAX_CHARS.toLocaleString()}
            </span>
          </div>
        </section>

        {/* Category summary */}
        {localIssues.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {(Object.keys(CATEGORY_META) as (keyof typeof CATEGORY_META)[])
              .filter((cat) => counts[cat])
              .map((cat) => (
                <span
                  key={cat}
                  className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 shadow-xs"
                >
                  <span className={`h-2 w-2 rounded-full ${CATEGORY_META[cat].dot}`} />
                  {CATEGORY_META[cat].label}
                  <span className="tabular-nums text-slate-400">{counts[cat]}</span>
                </span>
              ))}
            <span className="text-xs text-slate-400">Hover an underline to see suggestions</span>
          </div>
        )}

        <p className="mt-4 text-xs text-slate-400">
          Your text is sent to the server for checking and is not stored.
        </p>

        {/* How it works */}
        <section className="mt-16">
          <h2 className="text-center text-sm font-semibold uppercase tracking-wider text-slate-500">
            How it works
          </h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {HOW_IT_WORKS.map((item) => (
              <div
                key={item.step}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold tabular-nums text-blue-600">
                    {item.step}
                  </span>
                  <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                    {item.tech}
                  </span>
                </div>
                <h3 className="mt-3 text-base font-semibold text-slate-900">{item.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{item.description}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200/70 bg-white/60">
        <div className="mx-auto flex max-w-4xl flex-col items-center justify-between gap-2 px-6 py-6 text-xs text-slate-500 sm:flex-row">
          <span>© {new Date().getFullYear()} GrammarAI. Open source.</span>
          <span className="flex items-center gap-5">
            {AUTHOR_NAME &&
              (AUTHOR_URL ? (
                <a
                  href={AUTHOR_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-slate-600 hover:text-blue-600"
                >
                  Built by {AUTHOR_NAME}
                </a>
              ) : (
                <span className="font-medium text-slate-600">Built by {AUTHOR_NAME}</span>
              ))}
            <a
              href={REPO_URL}
              {...repoLinkProps}
              className="inline-flex items-center gap-1.5 font-medium text-slate-600 hover:text-blue-600"
            >
              <GithubIcon className="h-3.5 w-3.5" />
              Source code
            </a>
          </span>
        </div>
      </footer>
    </div>
  );
}

App.displayName = 'App';
export default App;