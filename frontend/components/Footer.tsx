import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-900 py-12 text-slate-400 text-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
        
        <div className="flex items-center gap-2">
           <div className="w-6 h-6 rounded bg-primary-600 flex items-center justify-center text-white font-bold text-xs">W</div>
           <span className="font-semibold text-slate-200">Weykon</span>
        </div>

        <div className="flex gap-6">
           <a href="#" className="hover:text-white transition-colors">Privacy</a>
           <a href="#" className="hover:text-white transition-colors">RSS</a>
           <a href="#" className="hover:text-white transition-colors">Twitter</a>
           <a href="#" className="hover:text-white transition-colors">GitHub</a>
        </div>

        <div className="text-center md:text-right">
          <p>&copy; {new Date().getFullYear()} Weykon's Blog.</p>
          <p className="mt-1 opacity-60">Built with Rust & Axum.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;