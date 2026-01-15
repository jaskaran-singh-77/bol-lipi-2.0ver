import React from 'react';
import { ArchitectureLayer } from '../types';

const layers: ArchitectureLayer[] = [
  {
    id: 'frontend',
    title: 'Frontend Layer',
    description: 'User Interface & Input',
    color: 'bg-blue-500',
    icon: 'devices',
    items: ['React SPA', 'Microphone API', 'Tailwind CSS']
  },
  {
    id: 'ai',
    title: 'AI Processing Layer',
    description: 'Intelligence & Conversion',
    color: 'bg-purple-600',
    icon: 'psychology',
    items: ['Google Speech-to-Text', 'Gemini API (Extraction)', 'Context Handling']
  },
  {
    id: 'logic',
    title: 'Business Logic',
    description: 'Mapping & Validation',
    color: 'bg-indigo-600',
    icon: 'account_tree',
    items: ['Data Formatting', 'Field Mapping', 'Validation Rules']
  },
  {
    id: 'data',
    title: 'Data & Storage',
    description: 'Persistence',
    color: 'bg-slate-700',
    icon: 'database',
    items: ['Firebase / GCP', 'Secure Storage', 'User Profile']
  }
];

const ArchitectureDiagram: React.FC = () => {
  return (
    <div className="w-full max-w-6xl mx-auto p-4 lg:p-10">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-black text-slate-800 dark:text-white mb-4">System Architecture</h2>
        <p className="text-slate-500 dark:text-slate-400">High-level overview of the Bol-Lipi technical stack</p>
      </div>

      <div className="relative">
        {/* Central Spine Line (Mobile Hidden) */}
        <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-500 via-purple-500 to-slate-700 transform -translate-x-1/2 rounded-full opacity-20"></div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-y-16 relative z-10">
          {layers.map((layer, index) => {
            const isLeft = index % 2 === 0;
            return (
              <div key={layer.id} className={`flex items-center ${isLeft ? 'md:justify-end md:pr-12' : 'md:justify-start md:pl-12 md:flex-row-reverse md:col-start-2'}`}>
                
                {/* Content Card */}
                <div className={`relative bg-white dark:bg-[#1e293b] p-6 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 w-full max-w-md transform transition-all hover:scale-105 hover:shadow-2xl group ${isLeft ? 'md:text-right' : 'md:text-left'}`}>
                  
                  {/* Connector Dot */}
                  <div className={`absolute top-1/2 w-4 h-4 rounded-full border-4 border-white dark:border-[#1e293b] ${layer.color} shadow-lg hidden md:block ${isLeft ? '-right-[54px]' : '-left-[54px]'} transform -translate-y-1/2`}></div>
                  
                  <div className={`flex items-center gap-4 mb-4 ${isLeft ? 'md:flex-row-reverse' : ''}`}>
                    <div className={`w-12 h-12 rounded-xl ${layer.color} flex items-center justify-center text-white shadow-lg`}>
                      <span className="material-symbols-outlined text-2xl">{layer.icon}</span>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-800 dark:text-white">{layer.title}</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{layer.description}</p>
                    </div>
                  </div>

                  <div className={`flex flex-wrap gap-2 ${isLeft ? 'md:justify-end' : ''}`}>
                    {layer.items.map(item => (
                      <span key={item} className="px-3 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-semibold">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ArchitectureDiagram;