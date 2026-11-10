import { useState, useEffect } from 'react';
import { Editor } from './components/Editor';
import { useGrammarCheck } from './hooks/useGrammarCheck';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

function App() {
  const [text, setText] = useState('');
  
  // Warm-up ping on mount
  useEffect(() => {
    fetch(`${API_URL}/health`).catch(() => {});
  }, []);

  const { issues: fetchedIssues, status } = useGrammarCheck(text, 500);
  const [localIssues, setLocalIssues] = useState(fetchedIssues);

  // Sync fetched issues into local state when new backend results arrive
  useEffect(() => {
    setLocalIssues(fetchedIssues);
  }, [fetchedIssues]);

  let statusText = '';
  if (status === 'checking') {
    statusText = 'Checking...';
  } else if (status === 'error') {
    statusText = "Couldn't reach the server";
  } else if (text.length > 5000) {
    statusText = 'Text exceeds 5,000 character limit';
  } else {
    statusText = `${localIssues.length} issue${localIssues.length === 1 ? '' : 's'}`;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center p-6 text-slate-800">
      <div className="max-w-3xl w-full space-y-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Grammarly Clone</h1>
          <p className="text-slate-500 text-sm mt-1">
            Milestone 3.3: Interactive Suggestion Cards & Apply Fix
          </p>
        </div>

        {/* Live Editor Box with Suggestion Popovers */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 space-y-3">
          <Editor 
            text={text} 
            onChange={setText} 
            issues={localIssues} 
            onIssuesUpdate={setLocalIssues}
          />
          
          <div className="flex justify-between items-center px-1">
            <span className="text-xs font-medium text-slate-500">
              {statusText}
            </span>
            <span className="text-xs text-slate-400">
              {text.length} / 5,000 chars
            </span>
          </div>
        </div>

        {/* Issues List */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
          <h2 className="text-lg font-bold">Detected Issues ({localIssues.length})</h2>
          {localIssues.length === 0 ? (
            <p className="text-sm text-slate-400 italic">
              Type something with a typo (e.g., "I recieve teh mesage") and click an underline to test suggestions!
            </p>
          ) : (
            <div className="space-y-3">
              {localIssues.map((issue) => (
                <div
                  key={issue.id}
                  className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-2 text-sm"
                >
                  <div>
                    <span className="font-semibold text-amber-900">"{issue.original}"</span>
                    <span className="text-amber-700 ml-2">({issue.message})</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {issue.replacements.map((rep, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 bg-white border border-amber-300 rounded-lg text-xs font-semibold text-amber-800"
                      >
                        {rep}
                      </span>
                    ))}
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

App.displayName = 'App';
export default App;