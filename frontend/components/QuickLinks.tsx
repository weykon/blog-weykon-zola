import React from 'react';
import { ArrowRightIcon } from './Icons';

const QuickLinks: React.FC = () => {
  return (
    <section className="py-16 bg-slate-50 border-t border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h3 className="text-2xl font-bold text-slate-900 mb-8">Quick Navigation</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 1 */}
          <a href="#" className="flex items-center justify-between p-6 bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-primary-200 transition-all group">
            <div>
              <h4 className="text-lg font-semibold text-slate-900 group-hover:text-primary-700 transition-colors">View all posts</h4>
              <p className="text-slate-500 text-sm mt-1">Browse the complete archive of articles</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-primary-50 group-hover:text-primary-600 transition-colors">
              <ArrowRightIcon className="w-4 h-4" />
            </div>
          </a>

          {/* Card 2 */}
          <a href="#" className="flex items-center justify-between p-6 bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-primary-200 transition-all group">
            <div>
              <h4 className="text-lg font-semibold text-slate-900 group-hover:text-primary-700 transition-colors">Browse by tags</h4>
              <p className="text-slate-500 text-sm mt-1">Find content by specific topics and technologies</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-primary-50 group-hover:text-primary-600 transition-colors">
              <ArrowRightIcon className="w-4 h-4" />
            </div>
          </a>
        </div>
      </div>
    </section>
  );
};

export default QuickLinks;