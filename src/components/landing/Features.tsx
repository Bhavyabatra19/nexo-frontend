"use client";


import React, { useState, useEffect } from 'react';

const Features: React.FC = () => {
  // Animation state for the Search Demo and Private Section
  const [step, setStep] = useState(0);
  const [privateVisible, setPrivateVisible] = useState(false);
  const [syncPhase, setSyncPhase] = useState(0);

  // Animation state for Relationship Context
  const [contextView, setContextView] = useState<'list' | 'profile'>('list');
  const [cursorAction, setCursorAction] = useState(false);

  // Animation state for WhatsApp Feature
  const [whatsappStep, setWhatsappStep] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setStep((prev) => (prev + 1) % 6);
    }, 1500);

    // Toggle private section visibility for a looping "fading" effect
    const privateTimer = setInterval(() => {
      setPrivateVisible(prev => !prev);
    }, 3500);

    // Loop for the "Sync" animation in the first feature
    const syncTimer = setInterval(() => {
      setSyncPhase(prev => (prev + 1) % 10);
    }, 400);

    // Loop for Relationship Context Animation
    let mounted = true;
    const contextLoop = async () => {
      while (mounted) {
        setContextView('list');
        setCursorAction(false);
        await new Promise(r => setTimeout(r, 2000));
        if (!mounted) break;
        
        setCursorAction(true); // Start cursor move & click
        await new Promise(r => setTimeout(r, 1500));
        if (!mounted) break;

        setContextView('profile'); // Switch to profile
        setCursorAction(false);
        await new Promise(r => setTimeout(r, 8000)); // Read profile (longer for more content)
      }
    };
    contextLoop();

    // Loop for WhatsApp Animation
    const whatsappTimer = setInterval(() => {
      setWhatsappStep((prev) => (prev + 1) % 6); // 0 (empty) -> 1 (Q) -> 2 (A) -> 3 (Q) -> 4 (A) -> 5 (Hold)
    }, 2000);

    return () => {
      clearInterval(timer);
      clearInterval(privateTimer);
      clearInterval(syncTimer);
      clearInterval(whatsappTimer);
      mounted = false;
    };
  }, []);

  // Names and roles for blurred profiles to look realistic
  const blurredProfiles = [
    { name: "Alice J.", role: "CEO @ Tech" },
    { name: "Bob S.", role: "Designer" },
    { name: "Charlie M.", role: "Founder" },
    { name: "David L.", role: "Engineer" },
    { name: "Emma W.", role: "Marketing" },
    { name: "Frank K.", role: "Investor" },
    { name: "Grace H.", role: "HR Manager" },
    { name: "Henry P.", role: "Product" },
    { name: "Ivy Q.", role: "Analyst" },
    { name: "Jack R.", role: "Architect" },
    { name: "Kate B.", role: "Operations" },
    { name: "Liam O.", role: "Sales" },
    { name: "Mona T.", role: "Legal" },
    { name: "Noah G.", role: "Developer" },
    { name: "Olivia V.", role: "Consultant" },
    { name: "Paul X.", role: "Director" },
  ];

  return (
    <section id="features" className="py-28 px-6">
      <div className="max-w-6xl mx-auto">
        
        {/* Features Header Signaling Start */}
        <div className="text-center mb-24 animate-fade-up">
          <div className="inline-block px-4 py-1.5 bg-blue-50 text-[#0047AB] rounded-full text-[10px] font-black tracking-[0.2em] mb-6 uppercase border border-blue-100 shadow-sm">
            Key Features
          </div>
          <h2 className="text-4xl md:text-5xl font-extrabold text-[#1a1a1a] mb-6 tracking-tight">
            Supercharge your networking.
          </h2>
          <p className="max-w-2xl mx-auto text-xl text-slate-500 font-medium">
            Discover the powerful tools inside Nexo designed to help you maintain meaningful connections without the manual effort.
          </p>
          <div className="mt-10 flex justify-center">
             <div className="w-px h-16 bg-gradient-to-b from-blue-500 to-transparent"></div>
          </div>
        </div>

        {/* 1st Feature: One home for your entire network (IMAGE RIGHT) */}
        <div className="grid md:grid-cols-2 gap-16 items-center mb-32">
          <div className="order-2 md:order-1">
             <div className="w-12 h-12 bg-blue-50 text-[#0047AB] rounded-xl flex items-center justify-center mb-6">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
             </div>
             <h2 className="text-4xl font-extrabold text-[#1a1a1a] mb-6 leading-tight">One home for your entire network.</h2>
             <p className="text-xl text-slate-500 leading-relaxed mb-8">Import contacts from LinkedIn, Gmail, Outlook, Notion, and more. Nexo automatically merges duplicates and creates a single, unified view of your professional life.</p>
          </div>
          
          <div className="order-1 md:order-2 bg-slate-50 rounded-[2.5rem] aspect-square flex items-center justify-center p-4 md:p-12 border border-slate-100 relative overflow-hidden group">
             {/* Dynamic Background Glow */}
             <div className="absolute inset-0 bg-blue-500/5 blur-[80px] rounded-full group-hover:bg-blue-500/10 transition-colors duration-1000"></div>
             
             {/* Scanning Line Animation Mocking a GIF */}
             <div className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-blue-400/50 to-transparent z-20 animate-[scanning_3s_ease-in-out_infinite] pointer-events-none"></div>
             
             <div className="relative w-full h-full flex items-center justify-center">
                {/* Circular Grid Lines */}
                <svg className="absolute w-full h-full opacity-10" viewBox="0 0 400 400">
                   <circle cx="200" cy="200" r="140" fill="none" stroke="#0047AB" strokeWidth="1" strokeDasharray="4 4" />
                   {[0, 45, 90, 135, 180, 225, 270, 315].map(deg => (
                     <line 
                        key={deg}
                        x1="200" y1="200" 
                        x2={200 + 140 * Math.cos((deg - 90) * Math.PI / 180)} 
                        y2={200 + 140 * Math.sin((deg - 90) * Math.PI / 180)} 
                        stroke="#0047AB" strokeWidth="1" 
                      />
                   ))}
                </svg>

                {/* Central Nexo Logo with Pulse */}
                <div className="z-10 bg-white p-5 rounded-full shadow-2xl border border-slate-100 group cursor-pointer transition-transform hover:scale-110 relative">
                   <div className="absolute inset-0 bg-[#0047AB]/20 rounded-full animate-ping opacity-20"></div>
                   <div className="w-16 h-16 bg-[#0047AB] rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(0,71,171,0.4)] group-hover:shadow-[0_0_50px_rgba(0,71,171,0.6)] transition-all">
                      <svg width="32" height="32" viewBox="0 0 100 100" className="text-white">
                        <path d="M20 80 V20 Q20 10 30 15 L70 45 L70 20 Q70 10 80 15 V80 Q80 90 70 85 L30 55 V80 Q30 90 20 85" fill="currentColor"/>
                      </svg>
                   </div>
                </div>

                {/* Connector Logos with Staggered Fade-in Animation Simulation */}
                
                {/* Facebook */}
                <div className={`absolute top-[0%] left-1/2 -translate-x-1/2 w-14 h-14 bg-white rounded-full shadow-lg flex items-center justify-center border border-slate-50 transition-all duration-700 ${syncPhase >= 1 ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
                   <svg className="w-7 h-7 text-[#1877F2]" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                </div>
                
                {/* LinkedIn */}
                <div className={`absolute top-[12%] right-[12%] w-14 h-14 bg-white rounded-full shadow-lg flex items-center justify-center p-3 border border-slate-50 transition-all duration-700 ${syncPhase >= 2 ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4'}`}>
                   <svg className="w-full h-full text-[#0A66C2]" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.238 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
                </div>
                
                {/* Gmail */}
                <div className={`absolute top-1/2 -translate-y-1/2 right-[0%] w-14 h-14 bg-white rounded-full shadow-lg flex items-center justify-center p-3 border border-slate-50 transition-all duration-700 ${syncPhase >= 3 ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4'}`}>
                   <svg className="w-full h-full" viewBox="0 0 24 24"><path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L12 9.573l8.073-6.08c1.618-1.214 3.927-.059 3.927 1.964z" fill="#EA4335"/></svg>
                </div>
                
                {/* Calendar */}
                <div className={`absolute bottom-[12%] right-[12%] w-14 h-14 bg-white rounded-full shadow-lg flex items-center justify-center p-3 border border-slate-50 transition-all duration-700 ${syncPhase >= 4 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                   <div className="w-full h-full bg-[#4285F4] rounded-md flex flex-col items-center justify-center text-white font-black leading-none overflow-hidden"><span className="text-[7px] mb-0.5">AUG</span><span className="text-xl">12</span></div>
                </div>
                
                {/* Contacts */}
                <div className={`absolute bottom-[0%] left-1/2 -translate-x-1/2 w-14 h-14 bg-white rounded-full shadow-lg flex items-center justify-center p-3 border border-slate-50 transition-all duration-700 ${syncPhase >= 5 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                   <div className="w-full h-full bg-[#4285F4] rounded-full flex items-center justify-center overflow-hidden"><svg className="w-3/4 h-3/4 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg></div>
                </div>
                
                {/* Instagram */}
                <div className={`absolute bottom-[12%] left-[12%] w-14 h-14 bg-white rounded-full shadow-lg flex items-center justify-center p-3 border border-slate-50 transition-all duration-700 ${syncPhase >= 6 ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'}`}>
                   <div className="w-full h-full bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] rounded-lg flex items-center justify-center p-1.5"><svg className="w-full h-full text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg></div>
                </div>
                
                {/* Notion */}
                <div className={`absolute top-1/2 -translate-y-1/2 left-[0%] w-14 h-14 bg-white rounded-full shadow-lg flex items-center justify-center p-2 border border-slate-100 transition-all duration-700 ${syncPhase >= 7 ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'}`}>
                   <div className="w-full h-full flex items-center justify-center font-black text-2xl text-slate-900 bg-white rounded-md border border-slate-200">N</div>
                </div>
                
                {/* Excel/Spreadsheets */}
                <div className={`absolute top-[12%] left-[12%] w-14 h-14 bg-white rounded-full shadow-lg flex items-center justify-center p-3 border border-slate-50 transition-all duration-700 ${syncPhase >= 8 ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
                   <div className="w-full h-full bg-[#1D6F42] rounded-md flex items-center justify-center text-white font-black text-xl">X</div>
                </div>
             </div>
          </div>
        </div>

        {/* 2nd Feature: Relationship Context (IMAGE LEFT) */}
        <div className="grid md:grid-cols-2 gap-16 items-center mb-32">
          <div className="order-1 bg-slate-50 rounded-[2.5rem] aspect-square flex items-center justify-center p-8 border border-slate-100 relative overflow-hidden">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-[320px] h-[520px] border border-slate-200 overflow-hidden relative mx-auto">
              
              {/* VIEW: CONTACT LIST */}
              <div className={`absolute inset-0 bg-white transition-transform duration-500 ease-in-out flex flex-col ${contextView === 'list' ? 'translate-x-0' : '-translate-x-full'}`}>
                 <div className="p-5 border-b border-slate-100 bg-white z-10 shrink-0">
                    <h3 className="text-lg font-bold text-slate-800 mb-3">Contacts</h3>
                    <div className="bg-slate-50 rounded-xl px-3 py-2.5 flex items-center gap-2 border border-slate-100">
                       <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                       <div className="h-1.5 w-24 bg-slate-200 rounded-full"></div>
                    </div>
                 </div>
                 <div className="flex-1 overflow-hidden p-3 space-y-2">
                    {/* Item 1 */}
                    <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors">
                       <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center font-bold text-purple-600 text-xs">AC</div>
                       <div className="flex-1">
                          <div className="font-bold text-sm text-slate-800">Alice Chen</div>
                          <div className="text-[10px] text-slate-400 font-medium">Connected 2m ago</div>
                       </div>
                    </div>
                    
                    {/* Item 2 (John - Target) */}
                    <div className={`flex items-center gap-3 p-3 rounded-xl transition-all duration-300 relative ${cursorAction ? 'bg-blue-50 scale-[0.98]' : 'bg-white'}`}>
                       <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center font-bold text-[#0047AB] text-xs">JD</div>
                       <div className="flex-1">
                          <div className="font-bold text-sm text-slate-800">John Doe</div>
                          <div className="text-[10px] text-slate-400 font-medium">Connected 5h ago</div>
                       </div>
                       
                       {/* Animated Cursor */}
                       <div className={`absolute z-50 pointer-events-none transition-all duration-700 ease-out ${cursorAction ? 'opacity-100 top-1/2 left-1/2 -translate-y-1/2 -translate-x-1/2' : 'opacity-0 top-[150%] left-[150%]'}`}>
                          <svg className="w-8 h-8 text-slate-800 drop-shadow-xl" viewBox="0 0 24 24" fill="currentColor" stroke="white" strokeWidth="1.5">
                             <path d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.87a.5.5 0 0 0 .35-.85L6.35 2.85a.5.5 0 0 0-.85.36z" />
                          </svg>
                          {cursorAction && (
                            <div className="absolute top-[-10px] left-[-10px] w-12 h-12 bg-blue-400/30 rounded-full animate-ping"></div>
                          )}
                       </div>
                    </div>

                    {/* Item 3 */}
                    <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors">
                       <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center font-bold text-emerald-600 text-xs">SM</div>
                       <div className="flex-1">
                          <div className="font-bold text-sm text-slate-800">Sarah Miller</div>
                          <div className="text-[10px] text-slate-400 font-medium">Connected 1d ago</div>
                       </div>
                    </div>

                    {/* Item 4 */}
                    <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors">
                       <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center font-bold text-orange-600 text-xs">MR</div>
                       <div className="flex-1">
                          <div className="font-bold text-sm text-slate-800">Mike Ross</div>
                          <div className="text-[10px] text-slate-400 font-medium">Connected 2d ago</div>
                       </div>
                    </div>

                    {/* Item 5 */}
                    <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors">
                       <div className="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center font-bold text-pink-600 text-xs">EW</div>
                       <div className="flex-1">
                          <div className="font-bold text-sm text-slate-800">Emily Wang</div>
                          <div className="text-[10px] text-slate-400 font-medium">Connected 3d ago</div>
                       </div>
                    </div>

                    {/* Item 6 */}
                    <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors">
                       <div className="w-10 h-10 rounded-full bg-cyan-100 flex items-center justify-center font-bold text-cyan-600 text-xs">DK</div>
                       <div className="flex-1">
                          <div className="font-bold text-sm text-slate-800">David Kim</div>
                          <div className="text-[10px] text-slate-400 font-medium">Connected 1w ago</div>
                       </div>
                    </div>

                    {/* Item 7 */}
                    <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors">
                       <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center font-bold text-indigo-600 text-xs">LP</div>
                       <div className="flex-1">
                          <div className="font-bold text-sm text-slate-800">Lisa Park</div>
                          <div className="text-[10px] text-slate-400 font-medium">Connected 2w ago</div>
                       </div>
                    </div>
                 </div>
              </div>

              {/* VIEW: PROFILE */}
              <div className={`absolute inset-0 bg-white transition-transform duration-500 ease-in-out flex flex-col ${contextView === 'profile' ? 'translate-x-0' : 'translate-x-full'}`}>
                 <div className="flex-1 overflow-hidden flex flex-col relative">
                   {/* Background Header with Name & Location */}
                   <div className="h-44 w-full bg-blue-50 relative shrink-0 flex flex-col justify-end p-6">
                      {/* Background Gradient & Pattern */}
                      <div className="absolute inset-0 bg-gradient-to-br from-blue-100 via-blue-50 to-white opacity-100"></div>
                      <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, #0047AB 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>
                      
                      {/* Back Button */}
                      <div className="absolute top-5 left-5 p-2 bg-white/80 backdrop-blur-md rounded-full text-slate-600 cursor-pointer hover:bg-white transition-colors z-20 shadow-sm border border-blue-100">
                         <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" /></svg>
                      </div>

                      {/* Header Content */}
                      <div className="relative z-10 flex items-end gap-5">
                         <div className="w-20 h-20 rounded-2xl bg-white p-1 shadow-xl shrink-0 -mb-1">
                             <div className="w-full h-full bg-gradient-to-br from-[#0047AB] to-blue-600 rounded-xl flex items-center justify-center text-white font-black text-2xl shadow-inner">JD</div>
                         </div>
                         <div className="mb-2">
                            <h3 className="text-2xl font-black text-slate-900 leading-none tracking-tight">John Doe</h3>
                            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 mt-1.5 uppercase tracking-wide">
                               <svg className="w-3.5 h-3.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                               New York, NY
                            </div>
                         </div>
                      </div>
                   </div>
                   
                   <div className="px-6 py-8 flex-1 flex flex-col overflow-y-auto no-scrollbar">
                      {/* Highlighted Relationship Context Box */}
                      <div className="bg-blue-50 border border-blue-100 rounded-xl p-5 mb-8 shadow-sm relative overflow-hidden animate-fade-up delay-1">
                         <div className="absolute top-0 left-0 w-1 h-full bg-[#0047AB]"></div>
                         <div className="flex items-center gap-2 mb-3">
                            <svg className="w-4 h-4 text-[#0047AB]" fill="currentColor" viewBox="0 0 20 20"><path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" /></svg>
                            <h4 className="text-[10px] font-black text-[#0047AB] uppercase tracking-widest">Relationship Context</h4>
                         </div>
                         <p className="text-sm font-medium text-slate-700 leading-relaxed">
                            College batchmate; interested in <span className="font-bold text-slate-900">F1</span> and <span className="font-bold text-slate-900">CRICKET</span>; last spoke about him starting his own startup.
                         </p>
                      </div>

                      {/* Experience Section */}
                      <div className="mb-6 animate-fade-up delay-2">
                         <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 pl-1">Experience</h4>
                         <div className="space-y-4">
                             {/* Goldman Sachs Logo & Info */}
                             <div className="flex items-center gap-4 group">
                                 <div className="w-12 h-12 bg-[#7399C6] rounded-xl flex items-center justify-center shrink-0 shadow-sm border border-slate-100 group-hover:scale-105 transition-transform">
                                     <span className="font-serif text-white font-bold text-lg">GS</span>
                                 </div>
                                 <div>
                                     <div className="text-sm font-bold text-slate-900 leading-tight">Goldman Sachs</div>
                                     <div className="text-xs font-medium text-slate-500 mt-0.5">Vice President</div>
                                 </div>
                             </div>

                             {/* JP Morgan Logo & Info */}
                             <div className="flex items-center gap-4 group">
                                 <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shrink-0 shadow-sm border border-slate-200 group-hover:scale-105 transition-transform overflow-hidden p-1">
                                     <div className="text-center leading-[0.85]">
                                       <span className="font-serif text-slate-900 font-bold text-[10px] block">J.P.</span>
                                       <span className="font-serif text-slate-900 font-bold text-[8px] block tracking-tight">Morgan</span>
                                     </div>
                                 </div>
                                 <div>
                                     <div className="text-sm font-bold text-slate-900 leading-tight">J.P. Morgan</div>
                                     <div className="text-xs font-medium text-slate-500 mt-0.5">Associate</div>
                                 </div>
                             </div>
                         </div>
                      </div>
                   </div>
                 </div>
              </div>
            </div>
          </div>

          <div className="order-2">
             <div className="w-12 h-12 bg-blue-50 text-[#0047AB] rounded-xl flex items-center justify-center mb-6">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
             </div>
             <h2 className="text-4xl font-extrabold text-[#1a1a1a] mb-6 leading-tight">Relationship Context</h2>
             <p className="text-xl text-slate-500 leading-relaxed">
               Stop digging through old emails and WhatsApp chats to remember who someone is. Open any profile to see an AI-generated summary of your history, key milestones, and the specific context of your relationship. NEXO organizes your messy notes and past interactions into a single, actionable narrative.
             </p>
          </div>
        </div>

        {/* 3rd Feature (Was 2): Keep in Touch (TEXT LEFT, IMAGE RIGHT) */}
        <div className="grid md:grid-cols-2 gap-16 items-center mb-32">
          <div className="order-2 md:order-1">
             <div className="w-12 h-12 bg-blue-50 text-[#0047AB] rounded-xl flex items-center justify-center mb-6">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
             </div>
             <h2 className="text-4xl font-extrabold text-[#1a1a1a] mb-6 leading-tight">
               Never lose touch with <br />smart reminders.
             </h2>
             <p className="text-xl text-slate-500 leading-relaxed mb-8">
               Set a "Keep in Touch" interval and Nexo will nudge you when it's time to reach out. Stop letting the important people in your life drift away.
             </p>
             <ul className="space-y-4">
               {["Automatic keep-in-touch reminders", "Calendar-synced scheduling", "Last-contact indicators"].map(item => (
                 <li key={item} className="flex items-center gap-3 font-semibold text-slate-700">
                   <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                   </svg>
                   {item}
                 </li>
               ))}
             </ul>
          </div>

          <div className="order-1 md:order-2 bg-slate-50 rounded-[2.5rem] aspect-square flex items-center justify-center p-8 border border-slate-100">
             <div className="bg-white rounded-3xl shadow-xl w-full max-w-sm border border-slate-200 overflow-hidden">
                <div className="flex border-b border-slate-100 px-6 pt-4">
                   <button className="flex-1 pb-3 text-sm font-bold text-slate-900 border-b-2 border-[#0047AB]">Today</button>
                   <button className="flex-1 pb-3 text-sm font-bold text-slate-400 hover:text-slate-600 transition-colors">Upcoming</button>
                   <button className="flex-1 pb-3 text-sm font-bold text-slate-400 hover:text-slate-600 transition-colors">Completed</button>
                </div>
                <div className="p-2">
                   <div className="flex items-center gap-4 px-4 py-5 border-b border-slate-50">
                      <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
                         <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" />
                         </svg>
                      </div>
                      <span className="flex-1 text-sm font-medium text-slate-400 line-through">Client meeting with ACME</span>
                      <div className="flex -space-x-2 mr-2">
                         <div className="w-7 h-7 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-[8px] font-bold">JD</div>
                         <div className="w-7 h-7 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-[8px] font-bold">AK</div>
                      </div>
                      <span className="text-[11px] font-bold text-slate-400">Apr 7</span>
                   </div>
                   <div className="flex items-center gap-4 px-4 py-5 border-b border-slate-50">
                      <div className="w-6 h-6 rounded-full border-2 border-slate-200 shrink-0"></div>
                      <span className="flex-1 text-sm font-semibold text-slate-700">John's birthday</span>
                      <div className="mr-2">
                         <div className="w-7 h-7 rounded-full border-2 border-white bg-orange-50 flex items-center justify-center text-[8px] font-bold text-orange-400">JB</div>
                      </div>
                      <span className="text-[11px] font-bold text-slate-400">Apr 9</span>
                   </div>
                   <div className="flex items-center gap-4 px-4 py-5">
                      <div className="w-6 h-6 rounded-full border-2 border-slate-200 shrink-0"></div>
                      <span className="flex-1 text-sm font-semibold text-slate-700">Sarah returns from Hawaii</span>
                      <span className="text-[11px] font-bold text-slate-400">Apr 13</span>
                   </div>
                </div>
             </div>
          </div>
        </div>

        {/* 4th Feature: Intelligence Search Engine (IMAGE LEFT, TEXT RIGHT) */}
        <div className="grid md:grid-cols-2 gap-16 items-center mb-32">
          <div className="order-1 bg-slate-50 rounded-[2.5rem] aspect-square flex items-center justify-center p-8 border border-slate-100 relative overflow-hidden">
             <div className="bg-white rounded-3xl shadow-2xl w-full h-[380px] border border-slate-200 flex flex-col p-6 overflow-hidden">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-3 h-3 rounded-full bg-red-400"></div><div className="w-3 h-3 rounded-full bg-yellow-400"></div><div className="w-3 h-3 rounded-full bg-green-400"></div><div className="flex-1 h-2 bg-slate-50 rounded mx-4"></div>
                </div>
                <div className="space-y-4">
                  {step >= 1 && <div className="flex justify-end animate-fade-up"><div className="max-w-[80%] bg-[#0047AB] text-white p-4 rounded-2xl rounded-tr-none text-sm font-medium shadow-lg">Looking for an AI founder in SF — ideally Stanford alum, pre-seed.</div></div>}
                  {step >= 2 && <div className="flex items-start gap-3 animate-fade-up"><div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0"><span className="text-xs text-[#0047AB] font-black">N</span></div><div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl rounded-tl-none text-sm font-medium text-slate-700 shadow-sm w-[85%]">Sure! I'm searching 3,000+ connections...<div className="mt-4 space-y-2 border-t border-slate-200/50 pt-4">{step >= 3 && <div className="flex items-center gap-2 text-xs text-slate-400"><svg className="w-4 h-4 text-emerald-500" fill="currentColor" viewBox="0 0 20 20"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"/></svg>Running embedding search</div>}{step >= 4 && <div className="flex items-center gap-2 text-xs text-slate-400"><svg className="w-4 h-4 text-emerald-500" fill="currentColor" viewBox="0 0 20 20"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"/></svg>Generating SQL query</div>}{step >= 5 && <div className="flex items-center gap-2 text-xs text-slate-400"><svg className="w-4 h-4 text-emerald-500" fill="currentColor" viewBox="0 0 20 20"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"/></svg>Scoring people with LLMs</div>}</div>{step >= 5 && <div className="mt-4 text-slate-900 font-bold">I found 25 people for you!</div>}</div></div>}
                </div>
             </div>
          </div>

          <div className="order-2">
             <div className="w-12 h-12 bg-blue-50 text-[#0047AB] rounded-xl flex items-center justify-center mb-6">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
             </div>
             <h2 className="text-4xl font-extrabold text-[#1a1a1a] mb-6 leading-tight">Intelligence Search Engine</h2>
             <p className="text-xl text-slate-500 leading-relaxed mb-8">Skip filters. Just describe who you're looking for - like "a fintech PM in NYC" - and we'll search across your networks using AI.</p>
             <div className="flex gap-4">
                <div className="bg-slate-50 px-4 py-2 rounded-full text-sm font-bold text-slate-600">Semantic Search</div>
                <div className="bg-slate-50 px-4 py-2 rounded-full text-sm font-bold text-slate-600">Natural Language</div>
             </div>
          </div>
        </div>

        {/* 5th Feature: Interact directly from WhatsApp (TEXT LEFT, IMAGE RIGHT) */}
        <div className="grid md:grid-cols-2 gap-16 items-center mb-32">
          <div className="order-2 md:order-1">
             <div className="w-12 h-12 bg-green-50 text-[#25D366] rounded-xl flex items-center justify-center mb-6 border border-green-100">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.008-.57-.008-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
             </div>
             <h2 className="text-4xl font-extrabold text-[#1a1a1a] mb-6 leading-tight">Interact directly from WhatsApp</h2>
             <p className="text-xl text-slate-500 leading-relaxed mb-8">
               Eliminate the data entry barrier. Chat with NEXO just like you chat with a friend to access our intelligent search engine. Instantly pull up summaries on connections, dictate notes to update profiles, and set follow-up reminders without ever leaving WhatsApp.
             </p>
          </div>

          <div className="order-1 md:order-2 bg-slate-50 rounded-[2.5rem] aspect-square flex items-center justify-center p-8 border border-slate-100">
             <div className="bg-[#e5ddd5] rounded-3xl shadow-xl w-full max-w-sm h-[500px] border border-slate-200 overflow-hidden relative flex flex-col">
                {/* WhatsApp Header */}
                <div className="bg-[#075E54] px-4 py-3 flex items-center gap-3 text-white shrink-0 z-10 shadow-sm">
                   <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-[#075E54] font-black text-xs">N</div>
                   <div className="flex-1">
                      <div className="font-bold text-sm leading-tight">Nexo AI</div>
                      <div className="text-[10px] opacity-80 leading-tight">online</div>
                   </div>
                   <div className="flex gap-4 opacity-80">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M15.9 14.3L15 13.4C14.5 12.9 14.5 12 15 11.5L16.4 10.1C16.9 9.6 16.9 8.7 16.4 8.2L14.7 6.5C14.2 6 13.3 6 12.8 6.5L11.4 7.9C10.9 8.4 10 8.4 9.5 7.9L7.4 5.8C6.9 5.3 6.9 4.4 7.4 3.9L8.8 2.5C9.3 2 9.3 1.1 8.8 0.6L7.1 -1.1C6.6 -1.6 5.7 -1.6 5.2 -1.1L3.1 1C1.2 2.9 0.7 5.7 1.8 8.1C2.9 10.5 5.2 12.8 7.6 14C10 15.2 12.8 14.7 14.7 12.8L16.8 10.7C17.3 10.2 17.3 9.3 16.8 8.8L15.9 14.3Z" fill="currentColor"/></svg>
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg>
                   </div>
                </div>

                {/* Chat Area */}
                <div className="flex-1 p-4 space-y-4 overflow-y-auto font-sans relative" style={{backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")', backgroundSize: '400px'}}>
                   {/* Overlay to fade background */}
                   <div className="absolute inset-0 bg-[#e5ddd5]/90"></div>

                   {/* Step 1: User asks */}
                   {whatsappStep >= 1 && (
                     <div className="flex justify-end animate-fade-up relative z-10">
                        <div className="bg-[#dcf8c6] px-3 py-2 rounded-lg rounded-tr-none shadow-sm max-w-[85%] text-xs text-slate-900 leading-relaxed relative">
                           Who is Aditya Jain?
                           <div className="text-[9px] text-slate-400 text-right mt-1 flex items-center justify-end gap-1">
                              10:42 AM <span className="text-blue-500">✓✓</span>
                           </div>
                           <div className="absolute -right-2 top-0 w-0 h-0 border-[6px] border-transparent border-t-[#dcf8c6] border-r-0 transform skew-x-12"></div>
                        </div>
                     </div>
                   )}

                   {/* Step 2: NEXO replies */}
                   {whatsappStep >= 2 && (
                     <div className="flex justify-start animate-fade-up relative z-10">
                        <div className="bg-white px-3 py-2 rounded-lg rounded-tl-none shadow-sm max-w-[85%] text-xs text-slate-900 leading-relaxed relative">
                           <span className="font-bold block mb-1">Aditya Jain</span>
                           Marketing Head at FinCorp. Met at the Bangalore Tech Summit. Interested in cross-promotions.
                           <div className="text-[9px] text-slate-400 text-right mt-1">10:42 AM</div>
                           <div className="absolute -left-2 top-0 w-0 h-0 border-[6px] border-transparent border-t-white border-l-0 transform -skew-x-12"></div>
                        </div>
                     </div>
                   )}

                   {/* Step 3: User commands */}
                   {whatsappStep >= 3 && (
                     <div className="flex justify-end animate-fade-up relative z-10">
                        <div className="bg-[#dcf8c6] px-3 py-2 rounded-lg rounded-tr-none shadow-sm max-w-[85%] text-xs text-slate-900 leading-relaxed relative">
                           Remind me to catch up with him tomorrow at 10 AM.
                           <div className="text-[9px] text-slate-400 text-right mt-1 flex items-center justify-end gap-1">
                              10:43 AM <span className="text-blue-500">✓✓</span>
                           </div>
                           <div className="absolute -right-2 top-0 w-0 h-0 border-[6px] border-transparent border-t-[#dcf8c6] border-r-0 transform skew-x-12"></div>
                        </div>
                     </div>
                   )}

                   {/* Step 4: NEXO confirms */}
                   {whatsappStep >= 4 && (
                     <div className="flex justify-start animate-fade-up relative z-10">
                        <div className="bg-white px-3 py-2 rounded-lg rounded-tl-none shadow-sm max-w-[85%] text-xs text-slate-900 leading-relaxed relative">
                           Done! 🗓️ Reminder set for tomorrow, 10:00 AM.
                           <div className="text-[9px] text-slate-400 text-right mt-1">10:43 AM</div>
                           <div className="absolute -left-2 top-0 w-0 h-0 border-[6px] border-transparent border-t-white border-l-0 transform -skew-x-12"></div>
                        </div>
                     </div>
                   )}
                </div>

                {/* Input Area Mockup */}
                <div className="bg-[#f0f0f0] px-2 py-2 flex items-center gap-2 z-10">
                   <div className="p-2 rounded-full text-slate-500"><svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 11c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm6 2c0-1.1-.9-2-2-2s-2 .9-2 2 .9 2 2 2 2-.9 2-2zM6 13c0-1.1-.9-2-2-2s-2 .9-2 2 .9 2 2 2 2-.9 2-2z"/></svg></div>
                   <div className="flex-1 bg-white rounded-full h-8 px-4 text-xs flex items-center text-slate-400">Type a message</div>
                   <div className="p-2 rounded-full bg-[#075E54] text-white flex items-center justify-center shadow-sm">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
                   </div>
                </div>
             </div>
          </div>
        </div>

        {/* 6th Feature: Built to be Private (IMAGE LEFT, TEXT RIGHT) - SWAPPED COLUMNS */}
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <div className="order-1 bg-slate-50 rounded-[2.5rem] aspect-square flex items-center justify-center p-8 border border-slate-100 relative overflow-hidden">
             {/* High Fidelity Blurred Profiles Grid */}
             <div className="grid grid-cols-4 gap-3 w-full h-full relative p-2">
                {blurredProfiles.map((profile, i) => (
                  <div key={i} className="bg-white rounded-xl border border-slate-100 p-3 flex flex-col items-center justify-center gap-1 shadow-sm overflow-hidden">
                     <img 
                       src={`https://i.pravatar.cc/100?u=${i}`} 
                       className="w-10 h-10 rounded-full blur-[4px] opacity-70 mb-1" 
                       alt=""
                     />
                     <div className="w-12 h-1.5 bg-slate-100 rounded-full blur-[2px]"></div>
                     <div className="w-8 h-1 bg-slate-50 rounded-full blur-[1.5px]"></div>
                  </div>
                ))}

                {/* Animated Privacy Overlay */}
                <div className={`absolute inset-0 bg-white/30 backdrop-blur-[8px] transition-all duration-1000 flex items-center justify-center ${privateVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
                   <div className="bg-white p-10 rounded-full shadow-[0_20px_60px_-10px_rgba(0,0,0,0.15)] border border-white flex items-center justify-center relative">
                      <div className="absolute inset-0 bg-[#0047AB]/5 rounded-full animate-ping"></div>
                      <svg className="w-16 h-16 text-[#0047AB] relative z-10" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                      </svg>
                   </div>
                   
                   <div className="absolute top-1/4 left-1/4 bg-emerald-500 text-white text-[9px] font-black px-3 py-1 rounded-full shadow-lg animate-bounce">ENCRYPTED</div>
                   <div className="absolute bottom-1/3 right-1/4 bg-blue-500 text-white text-[9px] font-black px-3 py-1 rounded-full shadow-lg animate-bounce" style={{ animationDelay: '0.5s' }}>PRIVATE DATA</div>
                </div>
             </div>
          </div>

          <div className="order-2">
             <div className="w-12 h-12 bg-blue-50 text-[#0047AB] rounded-xl flex items-center justify-center mb-6">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2a3 3 0 01-3 3H6a3 3 0 01-3-3v-2m18-4V7a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2h3m3 3V9m0 0l-3 3m3-3l3 3" />
                </svg>
             </div>
             <h2 className="text-4xl font-extrabold text-[#1a1a1a] mb-6 leading-tight">Built to be Private</h2>
             <div className="space-y-6 text-xl text-slate-500 leading-relaxed">
               <p>Your privacy is our top priority. NEXO is supported by subscriptions, not ads. We'll never sell your data to third parties.</p>
               <p>With NEXO, you're in full control of your data. Export or delete your data at any time.</p>
             </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Features;
