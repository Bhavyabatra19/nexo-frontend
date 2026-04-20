"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '../services/api';
import Navbar from '../components/landing/Navbar';
import Hero from '../components/landing/Hero';
import Features from '../components/landing/Features';
import Waitlist from '../components/landing/Waitlist';
import FAQ from '../components/landing/FAQ';
import Footer from '../components/landing/Footer';

const App: React.FC = () => {
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    if (authService.isAuthenticated()) {
      router.push('/dashboard/contacts');
    }
  }, [router]);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-white text-[#1a1a1a]">
      <style>{`
        body { font-family: 'Inter', sans-serif; }
        .glass-nav {
          background: rgba(255, 255, 255, 0.85);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          border-bottom: 1px solid rgba(0, 0, 0, 0.05);
        }
        .btn-primary {
          background-color: #0047AB;
          color: white;
          transition: all 0.2s ease;
        }
        .btn-primary:hover {
          background-color: #003682;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 71, 171, 0.2);
        }
        .feature-card {
          border: 1px solid #f0f0f0;
          transition: all 0.3s ease;
        }
        .feature-card:hover {
          border-color: #0047AB;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.04);
        }
      `}</style>
      <Navbar scrolled={scrolled} />
      <main>
        <Hero />
        <Features />
        <Waitlist />
        <FAQ />
      </main>
      <Footer />
    </div>
  );
};

export default App;
