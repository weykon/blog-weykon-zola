import React from 'react';
import { Mutter } from '../types';

const mutters: Mutter[] = [
  {
    id: '1',
    content: "耶！新完整这里，可以继续mutter了！！！！",
    date: "2025-10-19 09:15",
    charCount: 23,
    views: 0
  },
  {
    id: '2',
    content: "hi",
    date: "2025-10-19 09:15",
    charCount: 2,
    views: 0
  },
  {
    id: '3',
    content: "利润如果在桥梁的过路费，那么在流通的平分中，模型和单品的响应性希望是越来越高的，流通是提高他的积极性，\n\n那么如果在丰富化产品和商家的入口，并且在体验上的提升，让用户几乎零成本去体验到最快和最好的设想\n\n很难去计算，比如从一开始的单车租赁，他们的模式也是希望如此资金链的问题，使他们无法转起来。\n\n他们基于的消费点是过于窄小，所以如果大而全可能是一个这个模式的质变。",
    date: "2024-03-13 09:28",
    charCount: 205,
    views: 0
  },
  {
    id: '4',
    content: "从一开始很早的直播带货，他们的性质，是把模型（人，偶像）放在大众，我把这...",
    date: "2024-03-13 09:15",
    charCount: 35,
    views: 5
  }
];

const MutterList: React.FC = () => {
  return (
    <div className="pt-24 pb-20 bg-slate-50 min-h-screen">
      <div className="max-w-2xl mx-auto px-4 sm:px-6">
        
        <div className="text-center mb-8">
            <h2 className="text-xl font-medium text-slate-600">Mutters</h2>
            <p className="text-sm text-slate-400 mt-1">Quick thoughts and casual posts</p>
        </div>

        {/* Input Box */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-indigo-100 mb-10 ring-4 ring-indigo-50/50">
           <div className="mb-2">
             <h3 className="text-sm font-semibold text-indigo-600 mb-3">What's on your mind?</h3>
             <textarea 
               className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all resize-none text-slate-700"
               rows={4}
               placeholder="Share your thoughts... (max 1000 characters)"
             ></textarea>
           </div>
           <div className="flex justify-between items-center mt-2">
             <div className="flex items-center gap-2">
                <input type="checkbox" id="custom-title" className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                <label htmlFor="custom-title" className="text-xs text-slate-500">Custom Title (optional)</label>
             </div>
             <div className="flex gap-2">
                 <button className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors">Clear</button>
                 <button className="px-6 py-2 rounded-lg text-sm font-medium bg-indigo-500 hover:bg-indigo-600 text-white shadow-md shadow-indigo-200 transition-all">Post Mutter</button>
             </div>
           </div>
        </div>

        {/* Timeline Stream */}
        <div className="space-y-6 relative">
          {/* Vertical line decoration */}
          <div className="absolute left-[3px] top-4 bottom-4 w-0.5 bg-indigo-100/50 -z-10"></div>

          {mutters.map((mutter) => (
            <div key={mutter.id} className="relative pl-6">
               {/* Timeline dot */}
               <div className="absolute left-0 top-6 w-2 h-2 rounded-full bg-indigo-400 border-2 border-slate-50"></div>
               
               <div className="bg-white rounded-lg p-5 border-l-4 border-indigo-500 shadow-sm hover:shadow hover:bg-slate-50/50 transition-all">
                  <div className="prose prose-sm max-w-none text-slate-800 whitespace-pre-line mb-4 leading-relaxed font-sans">
                    {mutter.content}
                  </div>
                  
                  <div className="flex items-center gap-4 text-xs text-slate-400 border-t border-slate-100 pt-3">
                    <span className="font-mono">{mutter.date}</span>
                    <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                    <span>{mutter.charCount} chars</span>
                    <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                    <span className="text-indigo-400 hover:underline cursor-pointer">Link</span>
                  </div>
               </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
};

export default MutterList;
