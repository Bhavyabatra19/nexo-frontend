"use client";


import React, { useState } from 'react';
import { FAQItem } from '@/types';

const faqItems: FAQItem[] = [
  {
    question: "How is Nexo different from LinkedIn?",
    answer: "LinkedIn is a public broadcasting platform. Nexo is your private memory bank—a space to store personal context, meeting history, and private relationship insights that don't belong in the public eye."
  },
  {
    question: "Is my personal data secure?",
    answer: "Security is our core pillar. We use industry-standard bank-level encryption. Your notes and contact details are private to you and never shared or sold for advertising."
  },
  {
    question: "How does the AI feature work?",
    answer: "Our AI processes your unstructured notes (like a messy summary of a lunch meeting) and identifies actionable items, personal preferences (like spouse names or favorite wines), and schedules future nudges automatically."
  },
  {
    question: "Can I export my network data?",
    answer: "Yes, you own your data. You can export your entire contact history, notes, and relationship logs in CSV or JSON format at any time with a single click."
  }
];

const FAQ: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="py-24 px-6 bg-white">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-4xl font-extrabold mb-12 text-center text-slate-900">Questions? We have answers</h2>
        <div className="space-y-4">
          {faqItems.map((item, index) => (
            <div key={index} className="bg-white rounded-3xl border border-slate-200 overflow-hidden transition-all duration-300 hover:border-blue-200">
              <button 
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full p-6 text-left flex items-center justify-between hover:bg-slate-50 transition-colors"
              >
                <span className="font-bold text-lg text-slate-900">{item.question}</span>
                <div className={`p-1 rounded-full bg-blue-50 text-blue-600 transition-transform ${openIndex === index ? 'rotate-180' : ''}`}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>
              <div className={`transition-all duration-300 ease-in-out ${openIndex === index ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="p-6 pt-0 text-slate-500 font-medium leading-relaxed border-t border-slate-100 mt-0">
                  {item.answer}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FAQ;
