import React, { useState } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Features from './components/Features';
import QuickLinks from './components/QuickLinks';
import PostList from './components/PostList';
import MutterList from './components/MutterList';
import Footer from './components/Footer';

function App() {
  const [currentPage, setCurrentPage] = useState('home');

  const renderContent = () => {
    switch (currentPage) {
      case 'home':
        return (
          <>
            <Hero />
            <Features />
            <QuickLinks />
          </>
        );
      case 'posts':
        return <PostList />;
      case 'mutters':
        return <MutterList />;
      default:
        // Fallback to home if page not found
        return (
          <>
            <Hero />
            <Features />
            <QuickLinks />
          </>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Navbar currentPage={currentPage} onNavigate={setCurrentPage} />
      <main className="flex-grow">
        {renderContent()}
      </main>
      <Footer />
    </div>
  );
}

export default App;
