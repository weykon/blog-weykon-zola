import React from 'react';
import Hero from '../../components/Hero';
import Features from '../../components/Features';
import QuickLinks from '../../components/QuickLinks';

const HomePage: React.FC = () => {
  return (
    <>
      <Hero />
      <Features />
      <QuickLinks />
    </>
  );
};

export default HomePage;
