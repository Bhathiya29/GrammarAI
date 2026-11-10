import { useState } from 'react';
import { checkText } from './api/client';
import type { Issue } from './types';

function App() {
  const [text, setText] = useState('');
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCheck = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await checkText(text);
      setIssues(response.issues);
    } catch (err: any) {
      setError(err.message || 'Failed to analyze text.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center p-6 text-slate-800">
      <div className="max-w-3xl w-full space-y-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Grammarly Clone</h1>
          <p className="text-slate-500 text-sm mt-1">
           Real spelling checks via SymSpell engine
          </p>
        </div>

        {/* Text Editor Box */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 space-y-4">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type or paste your text here..."
            rows={5}
            className="w-full p-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700 resize-y"
          />
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-400">
              {text.length} / 5,000 characters
            </span>
            <button
              onClick={handleCheck}
              disabled={loading || !text.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50 text-white font-medium py-2 px-5 rounded-xl transition-colors cursor-pointer shadow-sm"
            >
              {loading ? 'Checking...' : 'Check Text'}
            </button>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm">
            {error}
          </div>
        )}

        {/* Raw Issues List */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
          <h2 className="text-lg font-bold">Detected Issues ({issues.length})</h2>
          {issues.length === 0 ? (
            <p className="text-sm text-slate-400 italic">No issues found yet. Try typing something with a typo!</p>
          ) : (
            <div className="space-y-3">
              {issues.map((issue) => (
                <div
                  key={issue.id}
                  className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-2 text-sm"
                >
                  <div>
                    <span className="font-semibold text-amber-900">"{issue.original}"</span>
                    <span className="text-amber-700 ml-2">({issue.message})</span>
                    <div className="text-xs text-slate-500 mt-1">
                      Position: {issue.start}–{issue.end} | Category: {issue.category}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <span className="text-xs font-medium text-slate-500 self-center mr-1">Suggestions:</span>
                    {issue.replacements.length > 0 ? (
                      issue.replacements.map((rep, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-1 bg-white border border-amber-300 rounded-lg text-xs font-semibold text-amber-800 shadow-xs"
                        >
                          {rep}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-slate-400 italic">None</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;