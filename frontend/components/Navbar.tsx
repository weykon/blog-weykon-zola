import React, { useState, useEffect } from 'react';
import { NavItem } from '../types';

interface NavbarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

const navItems: NavItem[] = [
  { label: 'Home', id: 'home' },
  { label: 'Posts', id: 'posts' },
  { label: 'Mutters', id: 'mutters' },
  { label: 'Tags', id: 'tags' },
  { label: 'Admin', id: 'admin' },
];

const Navbar: React.FC<NavbarProps> = ({ currentPage, onNavigate }) => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleNavClick = (id: string) => {
    onNavigate(id);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <nav 
      className={`fixed top-0 w-full z-50 transition-all duration-300 ${
        scrolled || currentPage !== 'home'
          ? 'bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-sm py-3' 
          : 'bg-transparent py-5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          {/* Logo */}
          <div 
            className="flex items-center gap-3 cursor-pointer group"
            onClick={() => handleNavClick('home')}
          >
            <div className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold font-mono text-xl shadow-lg ring-2 ring-primary-500/50 transition-transform group-hover:scale-105">
              WE
            </div>
            <span className="font-bold text-xl tracking-tight text-slate-900">
              Weykon
            </span>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center space-x-8">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`text-sm font-medium transition-colors relative group px-1 py-1 ${
                  currentPage === item.id 
                    ? 'text-primary-600' 
                    : 'text-slate-600 hover:text-primary-600'
                }`}
              >
                {item.label}
                <span className={`absolute -bottom-1 left-0 h-0.5 bg-primary-500 transition-all duration-300 ${
                  currentPage === item.id ? 'w-full' : 'w-0 group-hover:w-full'
                }`}></span>
              </button>
            ))}
            <div className="flex items-center gap-2 pl-4 border-l border-slate-200">
                <span className="text-xs font-mono text-slate-400">weykona</span>
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary-500 to-blue-500 ring-2 ring-white shadow-sm"></div>
            </div>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center">
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-slate-600 hover:text-slate-900 focus:outline-none p-2"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white/95 backdrop-blur border-b border-slate-200 shadow-lg absolute w-full px-4 py-4 flex flex-col gap-4 animate-fadeIn">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={`text-left text-base font-medium py-2 px-2 rounded-lg transition-colors ${
                currentPage === item.id
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </nav>
  );
};

export default Navbar;
