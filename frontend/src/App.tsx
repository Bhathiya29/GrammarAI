import { useState } from 'react';
import type { HealthResponse } from './types';

function App() {
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const checkBackend = async () => {
    setLoading(true);
    setStatus(null);
    setError(null);

    try {
      const response = await fetch('http://localhost:8000/health');
      if (!response.ok) {
        throw new Error(`Server returned status ${response.status}`);
      }
      const data: HealthResponse = await response.json();
      setStatus(data.status);
    } catch (err: any) {
      setError(err.message || 'Failed to connect to the backend.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-slate-800">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 max-w-md w-full text-center space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Grammarly Clone</h1>
          <p className="text-slate-500 text-sm mt-1">
            Frontend & Backend Integration Test
          </p>
        </div>

        {/* 1. Button with hover states and styling */}
        <button
          onClick={checkBackend}
          disabled={loading}
          className="w-full bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50 text-white font-medium py-2.5 px-4 rounded-xl transition-colors shadow-sm cursor-pointer"
        >
          {loading ? 'Checking...' : 'Check backend'}
        </button>

        {/* 2. Success state */}
        {status && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-sm font-medium">
            Status: <span className="font-bold">{status}</span>
          </div>
        )}

        {/* 2. Error state */}
        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm font-medium">
            Error: {error}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;