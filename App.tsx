import React, { useState, useRef } from 'react';
import VoiceFormDemo from './components/VoiceFormDemo';
import ArchitectureDiagram from './components/ArchitectureDiagram';
import { Language } from './types';

function App() {
  const [lang, setLang] = useState<Language>(Language.HINDI);
  const [darkMode, setDarkMode] = useState(false);
  
  const demoRef = useRef<HTMLElement>(null);
  const archRef = useRef<HTMLElement>(null);
  const processRef = useRef<HTMLElement>(null);

  const toggleLanguage = () => {
    setLang(prev => prev === Language.HINDI ? Language.ENGLISH : Language.HINDI);
  };

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    if (document.documentElement.classList.contains('dark')) {
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.classList.add('dark');
    }
  };

  const scrollToSection = (ref: React.RefObject<HTMLElement>) => {
    ref.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className={`min-h-screen flex flex-col ${darkMode ? 'dark' : ''}`}>
      {/* Navigation */}
      <header className="sticky top-0 z-50 bg-background-light/90 dark:bg-background-dark/90 backdrop-blur-lg border-b border-solid border-slate-200 dark:border-slate-800 px-4 md:px-10 lg:px-40 py-3 flex items-center justify-between transition-colors">
        <div className="flex items-center gap-3">
          <div className="size-8 text-primary">
            <span className="material-symbols-outlined text-4xl">campaign</span>
          </div>
          <h1 className="text-slate-900 dark:text-white text-2xl font-black tracking-tight">
            {lang === Language.HINDI ? 'बोल-लिपि' : 'Bol-Lipi'}
          </h1>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={toggleLanguage} 
            className="flex min-w-[100px] cursor-pointer items-center justify-center rounded-xl h-10 px-4 bg-primary text-white text-sm font-bold hover:brightness-110 transition-all shadow-md shadow-blue-500/20"
          >
            {lang === Language.HINDI ? 'English' : 'हिंदी'}
          </button>
          <button 
            onClick={toggleDarkMode} 
            className="flex items-center justify-center rounded-xl h-10 w-10 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white hover:scale-105 transition-transform"
          >
            <span className="material-symbols-outlined">
              {darkMode ? 'light_mode' : 'dark_mode'}
            </span>
          </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center w-full">
        
        {/* Hero Section */}
        <section className="w-full max-w-[1440px] px-4 md:px-10 lg:px-20 py-8 lg:py-16">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-blue-700 dark:from-[#083a9e] dark:to-blue-900 min-h-[500px] flex flex-col md:flex-row items-center justify-between p-8 md:p-16 gap-12 shadow-2xl shadow-blue-900/20">
            <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '40px 40px' }}></div>
            
            <div className="flex flex-col gap-6 text-left relative z-10 md:w-1/2 animate-fade-in-up">
              <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-4 py-2 rounded-full w-fit border border-white/20">
                <span className="material-symbols-outlined text-white text-sm">verified</span>
                <span className="text-white text-sm font-bold">Powered by Google Gemini AI</span>
              </div>
              <h1 className="text-white text-5xl md:text-6xl lg:text-7xl font-black leading-tight tracking-tight">
                {lang === Language.HINDI ? 'बोलें, हम भर देंगे' : 'You Speak, We Fill.'}
              </h1>
              <p className="text-blue-100 text-lg md:text-xl font-normal leading-relaxed max-w-lg">
                {lang === Language.HINDI 
                  ? 'निरक्षर और अर्ध-साक्षर उपयोगकर्ताओं के लिए आवाज-आधारित एआई फॉर्म सहायक। कोई टाइपिंग नहीं - सिर्फ बोलें।'
                  : 'Voice-based AI form assistant for everyone. No typing, no reading required - just speak in your language.'}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <button 
                  onClick={() => scrollToSection(demoRef)} 
                  className="flex w-fit min-w-[180px] cursor-pointer items-center justify-center gap-3 rounded-xl h-14 px-8 bg-accent-orange hover:bg-orange-600 text-white text-lg font-bold shadow-xl shadow-orange-500/30 hover:scale-105 transition-all"
                >
                  <span className="material-symbols-outlined text-2xl">mic</span>
                  <span>{lang === Language.HINDI ? 'अभी आज़माएं' : 'Try Demo'}</span>
                </button>
                <button 
                  onClick={() => scrollToSection(processRef)} 
                  className="flex w-fit min-w-[180px] cursor-pointer items-center justify-center gap-3 rounded-xl h-14 px-8 bg-white/10 backdrop-blur-sm text-white text-lg font-bold border border-white/30 hover:bg-white/20 transition-all"
                >
                  <span className="material-symbols-outlined text-2xl">info</span>
                  <span>{lang === Language.HINDI ? 'कैसे काम करता है' : 'How it works'}</span>
                </button>
              </div>
            </div>

            <div className="relative z-10 md:w-1/2 flex justify-center">
               {/* Decorative Abstract visual */}
               <div className="relative w-80 h-80 lg:w-96 lg:h-96">
                  <div className="absolute inset-0 bg-blue-400/30 rounded-full blur-3xl animate-pulse-slow"></div>
                  <div className="absolute inset-4 bg-white/10 backdrop-blur-md rounded-3xl border border-white/20 shadow-2xl flex items-center justify-center overflow-hidden">
                    <div className="text-center p-8">
                      <div className="inline-block p-6 rounded-full bg-blue-600/20 mb-6">
                        <span className="material-symbols-outlined text-6xl text-white">record_voice_over</span>
                      </div>
                      <div className="space-y-3">
                        <div className="h-2 w-32 bg-white/20 rounded-full mx-auto"></div>
                        <div className="h-2 w-24 bg-white/20 rounded-full mx-auto"></div>
                        <div className="h-2 w-40 bg-white/40 rounded-full mx-auto mt-4"></div>
                        <div className="h-2 w-20 bg-white/40 rounded-full mx-auto"></div>
                      </div>
                    </div>
                  </div>
                  {/* Floating Elements */}
                  <div className="absolute -top-6 -right-6 bg-green-500 text-white p-4 rounded-2xl shadow-lg animate-bounce delay-700">
                    <span className="material-symbols-outlined text-3xl">check</span>
                  </div>
                  <div className="absolute -bottom-6 -left-6 bg-accent-orange text-white p-4 rounded-2xl shadow-lg animate-bounce">
                    <span className="material-symbols-outlined text-3xl">edit_note</span>
                  </div>
               </div>
            </div>
          </div>
        </section>

        {/* Demo Section */}
        <section ref={demoRef} className="w-full bg-slate-50 dark:bg-[#0f1520] py-16 md:py-24">
           <VoiceFormDemo currentLang={lang} />
        </section>

        {/* Features Section */}
        <section className="w-full bg-white dark:bg-[#1a2333] py-20 px-4 md:px-10 lg:px-40">
           <div className="max-w-7xl mx-auto">
                <div className="text-center mb-16">
                    <h2 className="text-slate-900 dark:text-white text-3xl md:text-5xl font-bold leading-tight mb-6">
                      {lang === Language.HINDI ? 'मुख्य विशेषताएं' : 'Core Features'}
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 text-xl max-w-2xl mx-auto">
                      {lang === Language.HINDI 
                        ? 'हर भारतीय के लिए डिजिटल सेवाएं सुलभ बनाना'
                        : 'Making digital services accessible to every Indian citizen through AI.'}
                    </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {[
                      { icon: 'mic', color: 'text-primary', bg: 'bg-blue-100 dark:bg-blue-900/30', title: 'Voice First', titleHi: 'आवाज-आधारित', desc: 'No typing needed.', descHi: 'टाइपिंग की जरूरत नहीं।' },
                      { icon: 'psychology', color: 'text-purple-600', bg: 'bg-purple-100 dark:bg-purple-900/30', title: 'AI Understanding', titleHi: 'AI-संचालित', desc: 'Understands intent.', descHi: 'इरादे को समझता है।' },
                      { icon: 'edit_note', color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900/30', title: 'Auto-Fill', titleHi: 'स्वचालित फॉर्म', desc: 'Extracts & fills data.', descHi: 'जानकारी निकालता है।' },
                      { icon: 'volume_up', color: 'text-orange-600', bg: 'bg-orange-100 dark:bg-orange-900/30', title: 'Audio Feedback', titleHi: 'बोली जाने वाली पुष्टि', desc: 'Reads back to you.', descHi: 'वापस सुनाता है।' },
                      { icon: 'translate', color: 'text-pink-600', bg: 'bg-pink-100 dark:bg-pink-900/30', title: 'Multi-lingual', titleHi: 'बहुभाषी', desc: 'Hindi & English.', descHi: 'हिंदी और अंग्रेजी।' },
                      { icon: 'security', color: 'text-cyan-600', bg: 'bg-cyan-100 dark:bg-cyan-900/30', title: 'Secure', titleHi: 'सुरक्षित', desc: 'Private & Safe.', descHi: 'निजी और सुरक्षित।' },
                    ].map((feature, idx) => (
                      <div key={idx} className="flex flex-col items-center text-center gap-4 p-8 bg-slate-50 dark:bg-[#1e293b] rounded-3xl border border-slate-100 dark:border-slate-700 hover:shadow-xl transition-all hover:-translate-y-1">
                          <div className={`w-16 h-16 rounded-2xl ${feature.bg} flex items-center justify-center`}>
                              <span className={`material-symbols-outlined ${feature.color} text-4xl`}>{feature.icon}</span>
                          </div>
                          <h3 className="text-xl font-bold text-slate-800 dark:text-white">
                            {lang === Language.HINDI ? feature.titleHi : feature.title}
                          </h3>
                          <p className="text-slate-500 dark:text-slate-400">
                            {lang === Language.HINDI ? feature.descHi : feature.desc}
                          </p>
                      </div>
                    ))}
                </div>
            </div>
        </section>

        {/* Process Flow */}
        <section ref={processRef} className="w-full bg-slate-50 dark:bg-[#161d2b] py-20">
          <div className="max-w-4xl mx-auto px-4">
             <div className="text-center mb-16">
                <h2 className="text-slate-900 dark:text-white text-3xl md:text-4xl font-bold mb-4">
                  {lang === Language.HINDI ? 'प्रक्रिया प्रवाह' : 'How It Works'}
                </h2>
                <p className="text-slate-500 dark:text-slate-400">Step-by-step AI processing</p>
             </div>
             
             <div className="space-y-4">
                {[
                  { step: 1, title: 'Start', desc: 'User opens app', color: 'bg-blue-500' },
                  { step: 2, title: 'Speak', desc: 'User speaks details naturally', color: 'bg-blue-600' },
                  { step: 3, title: 'Speech-to-Text', desc: 'Convert voice to text', color: 'bg-purple-500' },
                  { step: 4, title: 'Gemini AI', desc: 'Extract structured data (JSON)', color: 'bg-purple-600' },
                  { step: 5, title: 'Auto-Fill', desc: 'Populate form fields', color: 'bg-green-500' },
                  { step: 6, title: 'Verify', desc: 'User confirms or edits', color: 'bg-green-600' },
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center gap-6 p-4 bg-white dark:bg-[#1e293b] rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden group hover:border-primary/50 transition-colors">
                     <div className={`w-12 h-12 rounded-full ${item.color} flex items-center justify-center text-white font-bold text-xl shadow-lg shrink-0 z-10`}>
                       {item.step}
                     </div>
                     {idx < 5 && <div className="absolute left-[39px] top-12 bottom-[-20px] w-0.5 bg-slate-200 dark:bg-slate-600 -z-0"></div>}
                     <div>
                       <h3 className="text-lg font-bold text-slate-800 dark:text-white">{item.title}</h3>
                       <p className="text-slate-500 dark:text-slate-400 text-sm">{item.desc}</p>
                     </div>
                  </div>
                ))}
             </div>
          </div>
        </section>

        {/* Architecture Section */}
        <section ref={archRef} className="w-full bg-white dark:bg-[#1a2333] py-20 border-t border-slate-100 dark:border-slate-800">
           <ArchitectureDiagram />
        </section>

      </main>

      <footer className="bg-slate-900 text-slate-400 py-8 text-center border-t border-slate-800">
        <p>© 2024 Bol-Lipi. Built with Google Gemini & React.</p>
      </footer>
    </div>
  );
}

export default App;