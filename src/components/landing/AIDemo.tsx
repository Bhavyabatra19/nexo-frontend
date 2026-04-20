"use client";


import React, { useState } from 'react';
import { analyzeRelationship } from '@/services/geminiService';
import { AIResponse } from '@/types';

const AIDemo: React.FC = () => {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AIResponse | null>(null);

  const handleAnalyze = async () => {
    if (!input.trim()) return;
    setLoading(true);
    const analysis = await analyzeRelationship(input);
    setResult(analysis);
    setLoading(false);
  };

  return (
    <section id="demo" className="py-28 px-6 bg-white">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <div className="inline-block px-4 py-1.5 bg-blue-50 text-[#0047AB] rounded-full text-xs font-black tracking-widest mb-6 uppercase">
            Powerful Nexo AI
          </div>
          <h2 className="text-4xl font-extrabold mb-4 text-[#1a1a1a]">Intelligence that scales empathy.</h2>
          <p className="text-slate-500 font-medium text-lg max-w-2xl mx-auto">
            Our AI helps you turn scattered thoughts into actionable relationship management. 
            Try pasting a note below.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-[#f8f9fc] rounded-[2rem] p-8 border border-slate-200 flex flex-col h-full shadow-sm">
            <textarea
              className="flex-1 w-full bg-white border border-slate-200 rounded-2xl p-6 text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-[#0047AB] transition-all resize-none min-h-[200px] shadow-inner text-base"
              placeholder="e.g., Met David at the park. He's working on a new startup in the fintech space. He loves bouldering. We should grab coffee next Thursday."
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            <button
              onClick={handleAnalyze}
              disabled={loading || !input.trim()}
              className="mt-6 w-full py-4 btn-primary rounded-2xl font-bold flex items-center justify-center gap-2"
            >
              {loading ? (
                <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : 'Analyze with Nexo AI'}
            </button>
          </div>

          <div className="bg-white rounded-[2rem] p-8 border border-slate-200 flex flex-col justify-center min-h-[300px] shadow-xl shadow-[#0047AB]/5">
            {!result && !loading && (
              <div className="text-center space-y-4 py-12">
                <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto text-blue-300">
                   <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                   </svg>
                </div>
                <p className="text-slate-400 font-bold italic">Nexo AI analysis will appear here.</p>
              </div>
            )}

            {loading && (
              <div className="space-y-6 animate-pulse">
                <div className="h-5 bg-slate-100 rounded w-3/4"></div>
                <div className="h-5 bg-slate-100 rounded w-1/2"></div>
                <div className="space-y-3 mt-8">
                  <div className="h-16 bg-slate-100 rounded-2xl"></div>
                  <div className="h-16 bg-slate-100 rounded-2xl"></div>
                </div>
              </div>
            )}

            {result && !loading && (
              <div className="animate-fade-up space-y-8">
                <div>
                   <h4 className="text-[10px] font-black text-[#0047AB] uppercase tracking-[0.2em] mb-3">Relationship Intelligence</h4>
                   <div className="flex items-center gap-4">
                      <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-[#0047AB] rounded-full transition-all duration-1000 shadow-[0_0_15px_rgba(0,71,171,0.3)]"
                          style={{ width: `${result.relationshipScore}%` }}
                        ></div>
                      </div>
                      <span className="text-2xl font-black text-[#1a1a1a]">{result.relationshipScore}</span>
                   </div>
                </div>

                <div>
                   <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Extracted Summary</h4>
                   <p className="text-slate-800 leading-relaxed font-semibold bg-blue-50/30 p-4 rounded-2xl border border-blue-100/50">
                    {result.summary}
                   </p>
                </div>

                <div>
                   <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Suggested Actions</h4>
                   <ul className="space-y-3">
                    {result.reminders.map((rem, i) => (
                      <li key={i} className="flex items-start gap-3 text-[15px] text-slate-600 font-bold">
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0"></span>
                        {rem}
                      </li>
                    ))}
                   </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default AIDemo;
