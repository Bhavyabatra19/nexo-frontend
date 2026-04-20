"use client";


import React from 'react';
import { GoogleLoginBtn } from './GoogleLoginBtn';

const Waitlist: React.FC = () => {

  return (
    <section id="waitlist" className="py-32 px-6 bg-[#f8f9fc]">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-50 text-[#0047AB] rounded-full text-[10px] font-black tracking-widest uppercase mb-6 shadow-sm border border-blue-100">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#0047AB]"></span>
            </span>
            Founding Member Early Access
          </div>

          <h2 className="text-4xl md:text-5xl font-extrabold mb-6 text-[#1a1a1a] leading-tight tracking-tight">
            Experience the First intelligent <br />Personal relationship Management tool.
          </h2>

          <p className="text-slate-500 font-medium text-lg max-w-2xl mx-auto leading-relaxed">
            Join the inner circle for exclusive beta access and get <span className="text-[#0047AB] font-bold">50% off your first year.</span> Be the first to bring strategic intelligence to your network.
          </p>
        </div>

        <div className="bg-white rounded-[2.5rem] p-8 md:p-12 border border-slate-200 shadow-2xl shadow-blue-900/5 relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-orange-500 text-white text-[10px] font-black px-6 py-2 rounded-bl-2xl shadow-lg z-10">
            LIMITED TO FIRST 100 USERS
          </div>

          <div className="flex flex-col items-center justify-center space-y-6 relative z-0 py-10">
            <h3 className="text-2xl font-bold text-center text-slate-900 mb-4">Start organizing your network today.</h3>
            <GoogleLoginBtn
              className="w-full sm:w-auto px-10 py-5 bg-[#0047AB] text-white rounded-2xl font-black text-xl hover:bg-[#003d91] transition-all shadow-xl shadow-blue-500/20 active:scale-[0.98] flex items-center justify-center gap-4"
              text="Get Started Free with Google"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default Waitlist;
