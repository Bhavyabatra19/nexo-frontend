"use client";

import React from 'react';
import Link from 'next/link';
import { GoogleLoginBtn } from './GoogleLoginBtn';

interface NavbarProps {
  scrolled: boolean;
}

const Navbar: React.FC<NavbarProps> = ({ scrolled }) => {
  const scrollToSection = (id: string) => (e: React.MouseEvent) => {
    const element = document.getElementById(id);
    if (element) {
      e.preventDefault();
      element.scrollIntoView({ behavior: 'smooth' });
    }
    // If not on home page, default link behavior to /#id will occur.
  };

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'glass-nav py-3' : 'bg-transparent py-6'
      }`}>
      <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group cursor-pointer">
          <img src="/Nexo-Logo.jpg" alt="Nexo Logo" className="w-8 h-8 rounded-md object-contain group-hover:scale-110 transition-transform" />
          <span className="text-xl font-bold tracking-tight text-[#1a1a1a]">Nexo</span>
        </Link>

        <div className="hidden md:flex items-center gap-10 text-[15px] font-medium text-slate-600">
          <Link href="/#features" onClick={scrollToSection('features')} className="hover:text-[#0047AB] transition-colors font-bold">Features</Link>
          <Link href="/#waitlist" onClick={scrollToSection('waitlist')} className="hover:text-[#0047AB] transition-colors font-bold">Waitlist</Link>
        </div>

        <div className="flex items-center">
          <GoogleLoginBtn className="btn-primary px-8 py-2.5 rounded-lg text-[15px] font-bold shadow-lg shadow-blue-500/20" text="Sign In" />
        </div>
      </div>
    </nav>
  );
};

export default Navbar;