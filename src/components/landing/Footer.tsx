"use client";


import React from 'react';
import Link from 'next/link';

const Footer: React.FC = () => {
  return (
    <footer className="py-24 px-6 bg-white border-t border-slate-100">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-12 mb-20">
          <div className="col-span-2">
            <div className="flex items-center gap-2 mb-6">
              <img src="/Nexo-Logo.jpg" alt="Nexo Logo" className="w-8 h-8 rounded-md object-contain" />
              <span className="text-xl font-black text-[#1a1a1a]">Nexo</span>
            </div>
            <p className="text-slate-500 max-w-xs mb-8 font-medium leading-relaxed">
              Build stronger relationships with a tool that helps you stay in touch, remember details, and be more thoughtful.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-[#1a1a1a] mb-6">Product</h4>
            <ul className="space-y-4 text-slate-500 text-[15px] font-semibold">
              <li><a href="#" className="hover:text-[#0047AB] transition-colors">Desktop App</a></li>
              <li><a href="#waitlist" className="hover:text-[#0047AB] transition-colors">Waitlist</a></li>
              <li><a href="#" className="hover:text-[#0047AB] transition-colors">Changelog</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-[#1a1a1a] mb-6">Company</h4>
            <ul className="space-y-4 text-slate-500 text-[15px] font-semibold">
              <li><a href="#" className="hover:text-[#0047AB] transition-colors">About Us</a></li>
              <li><a href="#" className="hover:text-[#0047AB] transition-colors">Twitter</a></li>
              <li><Link href="/privacy-policy" className="hover:text-[#0047AB] transition-colors">Privacy</Link></li>
              <li><Link href="/terms-and-conditions" className="hover:text-[#0047AB] transition-colors">Terms</Link></li>
            </ul>
          </div>
        </div>

        <div className="pt-10 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4 text-xs font-bold text-slate-400">
          <p>© 2024 Nexo CRM. Nexo is a product of Northstar Labs Pvt Ltd. <br />Designed to help you build relationships that last.</p>
          <div className="flex gap-8">
            <a href="#" className="hover:text-[#0047AB] transition-colors">Security</a>
            <a href="#" className="hover:text-[#0047AB] transition-colors">Support</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
