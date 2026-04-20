"use client";


import React from 'react';

const Integrations: React.FC = () => {
  const platforms = [
    { name: 'Gmail', color: 'bg-red-50 text-red-600' },
    { name: 'LinkedIn', color: 'bg-blue-50 text-blue-600' },
    { name: 'Outlook', color: 'bg-sky-50 text-sky-600' },
    { name: 'Contacts', color: 'bg-orange-50 text-orange-600' },
    { name: 'Calendar', color: 'bg-emerald-50 text-emerald-600' },
    { name: 'Twitter', color: 'bg-indigo-50 text-indigo-600' }
  ];

  return (
    <section id="integrations" className="py-28 px-6 bg-[#f8f9fc]">
      <div className="max-w-6xl mx-auto text-center">
        <h2 className="text-4xl font-extrabold text-[#1a1a1a] mb-6">Everywhere you are.</h2>
        <p className="text-xl text-slate-500 mb-16 max-w-2xl mx-auto">
          Nexo connects with the tools you already use daily, bringing your network together into one cohesive view.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
          {platforms.map(p => (
            <div key={p.name} className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm hover:-translate-y-1 transition-all group">
               <div className={`w-12 h-12 ${p.color} rounded-xl mx-auto mb-4 flex items-center justify-center font-bold text-lg group-hover:scale-110 transition-transform`}>
                 {p.name[0]}
               </div>
               <span className="font-bold text-slate-700">{p.name}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Integrations;
