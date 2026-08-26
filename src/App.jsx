import React from 'react';
import QuestionBank from './components/QuestionBank';

const App = () => {
  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-black text-white text-lg">
              Q
            </div>
            <span className="font-bold text-lg tracking-tight text-white">QuizBolt Admin</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase">
              v1.0
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs text-slate-400">
            <span>Environment: <strong className="text-emerald-400 font-mono">Production DB Connected</strong></span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6">
        <QuestionBank />
      </main>
    </div>
  );
};

export default App;