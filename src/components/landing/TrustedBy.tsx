"use client";


import React from 'react';

const TrustedBy: React.FC = () => {
  const logos = [
    "Used at Google", "Apple Team Members", "Meta Networks", "OpenAI Connects", "Stripe Users", "Airbnb Hosts"
  ];

  return (
    <div className="py-20 border-b border-slate-100">
      <div className="max-w-6xl mx-auto px-6">
        <p className="text-center text-xs font-bold text-slate-400 uppercase tracking-widest mb-10">
          Loved by people at leading companies
        </p>
        <div className="flex flex-wrap justify-center items-center gap-12 md:gap-20 opacity-40 grayscale">
          {logos.map(logo => (
            <span key={logo} className="text-xl font-bold italic tracking-tighter text-slate-600">
              {logo.split(' ').pop()}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TrustedBy;
