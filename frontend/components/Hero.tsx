import React from 'react';
import MatrixRain from './MatrixRain';
import { ArrowRightIcon } from './Icons';

const Hero: React.FC = () => {
  return (
    <div className="relative w-full min-h-[90vh] flex items-center overflow-hidden bg-slate-50">
      {/* Background Matrix Rain */}
      <MatrixRain />
      
      {/* Overlay to ensure text readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-50/80 via-slate-50/50 to-slate-50 pointer-events-none"></div>
      <div className="absolute inset-0 bg-gradient-to-r from-slate-50/90 via-transparent to-slate-50/90 pointer-events-none"></div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 z-10 w-full">
        <div className="flex flex-col md:flex-row items-center justify-between gap-12">
          
          {/* Text Content */}
          <div className="flex-1 text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-50 border border-primary-100 text-primary-700 text-xs font-mono font-medium mb-6">
              <span className="w-2 h-2 rounded-full bg-primary-500 animate-pulse"></span>
              v2.0 System Online
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-slate-900 mb-6">
              <span className="block">Digital</span>
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-emerald-800">
                Garden.
              </span>
            </h1>
            
            <p className="text-xl text-slate-600 mb-8 max-w-lg mx-auto md:mx-0 leading-relaxed">
              Explore the intersection of system programming and web development. 
              Powered by <span className="font-mono text-slate-900 bg-slate-200 px-1 rounded">Rust</span> and <span className="font-mono text-slate-900 bg-slate-200 px-1 rounded">Axum</span>.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
              <button className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-slate-900 hover:bg-slate-800 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5">
                Start Reading
                <ArrowRightIcon className="ml-2 w-4 h-4" />
              </button>
              <button className="inline-flex items-center justify-center px-6 py-3 border border-slate-200 text-base font-medium rounded-lg text-slate-700 bg-white hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm">
                View Source
              </button>
            </div>
          </div>

          {/* Decorative Code Block / Visual */}
          <div className="flex-1 w-full max-w-lg relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-primary-600 to-blue-600 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
            <div className="relative rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl overflow-hidden">
               {/* Traffic lights */}
               <div className="flex gap-2 mb-4">
                  <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
               </div>
               
               {/* Mock Code */}
               <div className="font-mono text-sm leading-6">
                  <div className="text-slate-400">
                    <span className="text-purple-400">use</span> axum::{'{'}
                    <div className="pl-4">
                       routing::get,<br/>
                       Router,<br/>
                    </div>
                    {'}'};
                  </div>
                  <br/>
                  <div className="text-slate-400">
                    <span className="text-purple-400">async fn</span> <span className="text-blue-400">main</span>() {'{'}
                  </div>
                  <div className="pl-4 text-slate-300">
                     <span className="text-slate-500">// Initialize the app</span> <br/>
                     <span className="text-purple-400">let</span> app = Router::new() <br/>
                     &nbsp;&nbsp;.route(<span className="text-green-400">"/"</span>, get(root));
                  </div>
                  <div className="text-slate-400">{'}'}</div>
                  
                  <div className="mt-4 pt-4 border-t border-slate-800 animate-pulse text-primary-400">
                     $ cargo run --release<span className="animate-ping">_</span>
                  </div>
               </div>
            </div>
          </div>

        </div>
      </div>

      <div className="absolute bottom-0 w-full h-24 bg-gradient-to-t from-slate-50 to-transparent pointer-events-none"></div>
    </div>
  );
};

export default Hero;