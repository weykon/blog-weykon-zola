import React from 'react';
import { FeatureItem } from '../types';
import { LightningIcon, FileTextIcon, LayersIcon } from './Icons';

const features: FeatureItem[] = [
  {
    title: "Fast & Secure",
    description: "Built with Rust for maximum performance and memory safety. Powered by Axum framework.",
    icon: <LightningIcon className="w-6 h-6 text-white" />,
    tags: ['Rust', 'Axum', 'Tokio']
  },
  {
    title: "Markdown Editor",
    description: "Beautiful markdown editing experience with live preview and syntax highlighting.",
    icon: <FileTextIcon className="w-6 h-6 text-white" />,
    tags: ['CommonMark', 'Live Preview']
  },
  {
    title: "Rich Content",
    description: "Support for tags, categories, nested comments, and full-text search capabilities.",
    icon: <LayersIcon className="w-6 h-6 text-white" />,
    tags: ['PostgreSQL', 'Search']
  }
];

const Features: React.FC = () => {
  return (
    <section className="py-20 bg-white relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Engineered for Performance
          </h2>
          <p className="mt-4 text-lg text-slate-600 max-w-2xl mx-auto">
            A minimalist architecture leveraging the safety and speed of Rust.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div 
              key={index}
              className="group relative p-8 bg-slate-50 rounded-2xl border border-slate-200 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 overflow-hidden"
            >
              {/* Background Glow */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary-100 rounded-full blur-3xl -mr-16 -mt-16 transition-opacity opacity-0 group-hover:opacity-100"></div>

              <div className="relative">
                <div className="w-12 h-12 rounded-xl bg-slate-900 group-hover:bg-primary-600 transition-colors flex items-center justify-center mb-6 shadow-md">
                  {feature.icon}
                </div>
                
                <h3 className="text-xl font-bold text-slate-900 mb-3 group-hover:text-primary-700 transition-colors">
                  {feature.title}
                </h3>
                
                <p className="text-slate-600 leading-relaxed mb-6">
                  {feature.description}
                </p>

                <div className="flex flex-wrap gap-2">
                  {feature.tags?.map(tag => (
                    <span key={tag} className="px-2 py-1 bg-white border border-slate-200 rounded text-xs font-mono text-slate-500 font-medium">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;