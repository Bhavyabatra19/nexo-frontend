"use client";


import React from 'react';
import RotatingText from './RotatingText';
import { GoogleLoginBtn } from './GoogleLoginBtn';

const Hero: React.FC = () => {
  const phrases = [
    "Stronger Relationships.",
    "Timely Outreach.",
    "Warm Intros.",
    "Effortless Networking."
  ];



  return (
    <section className="pt-24 md:pt-40 pb-20 px-0 overflow-hidden bg-white">
      <div className="max-w-6xl mx-auto text-center px-6">
        <div className="animate-fade-up">
          <h1 className="text-3xl sm:text-5xl md:text-7xl font-extrabold tracking-tight mb-6 md:mb-8 leading-tight text-[#1a1a1a]">
            The personal CRM for <br className="hidden sm:block" />
            <span className="block mt-2">
              <RotatingText
                texts={phrases}
                mainClassName="text-[#0047AB] overflow-visible"
                staggerDuration={0.02}
                rotationInterval={3000}
                transition={{ type: 'spring', damping: 30, stiffness: 400 }}
              />
            </span>
          </h1>

          <p className="max-w-3xl mx-auto text-base md:text-xl text-slate-500 mb-8 md:mb-12 leading-relaxed font-normal">
            Automatically organize, intelligently search and keep your entire network in sync.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <GoogleLoginBtn
              className="w-full sm:w-auto px-8 md:px-12 py-3.5 md:py-4 btn-primary rounded-xl font-bold text-base md:text-lg shadow-xl shadow-blue-500/20"
              text="Sign in with Google"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
