"use client";


import React from 'react';
import { PricingPlan } from '@/types';

const plans: PricingPlan[] = [
  {
    name: "Free",
    price: "0",
    description: "Build a habit of staying in touch.",
    features: ["Up to 100 contacts", "Manual reminders", "Standard import", "Mobile & Desktop"],
  },
  {
    name: "Personal Pro",
    price: "15",
    description: "The complete tool for your network.",
    features: ["Unlimited contacts", "AI relationship insights", "LinkedIn & CRM syncing", "Bulk workflows"],
    isPopular: true
  },
  {
    name: "Team",
    price: "25",
    description: "Shared network intelligence for teams.",
    features: ["Collaborative database", "Shared notes", "Team activity log", "Admin controls"],
  }
];

const Pricing: React.FC = () => {
  return (
    <section id="pricing" className="py-28 px-6 bg-[#f8f9fc]">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-extrabold mb-4 text-[#1a1a1a]">Invest in your network.</h2>
          <p className="text-slate-500 font-medium text-lg">Start free, upgrade for more power.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map((plan) => (
            <div 
              key={plan.name} 
              className={`relative p-10 rounded-[2.5rem] bg-white border transition-all duration-500 ${
                plan.isPopular ? 'border-[#0047AB] shadow-2xl scale-105 z-10' : 'border-slate-200'
              }`}
            >
              <h3 className="text-lg font-black mb-1 text-[#1a1a1a] uppercase tracking-tighter">{plan.name}</h3>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-5xl font-black text-[#1a1a1a] tracking-tight">${plan.price}</span>
                <span className="text-slate-400 font-bold">/mo</span>
              </div>
              <p className="text-slate-500 mb-8 text-sm font-medium leading-relaxed">{plan.description}</p>
              
              <ul className="space-y-5 mb-12">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3 text-sm text-slate-700 font-bold leading-tight">
                    <svg className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>

              <button className={`w-full py-4 rounded-xl font-black text-base transition-all ${
                plan.isPopular 
                ? 'btn-primary' 
                : 'bg-slate-50 hover:bg-slate-100 text-slate-900 border border-slate-200'
              }`}>
                {plan.price === '0' ? 'Get Started' : `Buy ${plan.name}`}
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Pricing;
