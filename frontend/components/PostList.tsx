import React from 'react';
import { Post } from '../types';
import { ArrowRightIcon } from './Icons';

// Mock data based on user screenshots
const posts: Post[] = [
  {
    id: '1',
    title: '耶更新的blog perfect with claude',
    excerpt: 'Experiencing the new design flow with AI assistance.',
    date: '2025-10-19',
    views: 21,
    tags: ['Design', 'AI']
  },
  {
    id: '2',
    title: 'MLX LoRA',
    excerpt: '探索MLX中的LoRA微调：从理论到实践 最近我一直在研究如何在Apple Silicon设备上高效微调大型语言模型，发现MLX框架提供的LoRA实现非常优雅。今天想分享我的探索过程和一些思考。从MNIST到大语言模型：理解LoRA的直觉',
    date: '2025-04-20',
    views: 13,
    tags: ['ML', 'Apple Silicon']
  },
  {
    id: '3',
    title: 'GPU compute参与下的数据交互问题和探讨',
    excerpt: 'GPU 到 CPU 数据传输方法与优化策略 GPU 到 CPU 数据传输的方法 1. 缓冲区复制与映射',
    date: '2025-04-12',
    views: 10,
    tags: ['GPU', 'Optimization']
  },
  {
    id: '4',
    title: 'Trait Upcasting',
    excerpt: '原文：Trait upcasting This release includes a long awaited feature — the ability to upcast trait objects. If a trait has a supertrait you can coerce a reference to said trait object to a reference to a ...',
    date: '2025-04-03',
    views: 10,
    tags: ['Rust', 'Traits']
  },
  {
    id: '5',
    title: 'wgpu 阴影映射基础',
    excerpt: 'WebGPU 阴影映射实现与调试指南 前言 在 WebGPU 中实现阴影映射是 3D 渲染中的一个重要环节，但也容易出错的部分。本文将记录我在实现和调试 WebGPU 阴影映射过程中遇到的挑战，以及解决方案，特别关注顶点和索引缓冲区的管理问题。',
    date: '2025-04-01',
    views: 15,
    tags: ['Graphics', 'WebGPU']
  },
  {
    id: '6',
    title: 'Ready Paint 的 wgpu 代码抽象',
    excerpt: 'Ready-Paint: Rust图形渲染抽象之旅 从概念到实现：构建一个抽象的WGPU渲染框架 在深入Rust和图形编程的探索中，我创建了Ready-Paint库——一个WGPU的抽象层。这篇文章记录了我在设计和实现这个库的过程中所获得的经验和洞察，以及如何使用Rust强大的类型系统来解决实际问题。',
    date: '2025-04-01',
    views: 10,
    tags: ['Rust', 'Architecture']
  }
];

const PostList: React.FC = () => {
  return (
    <div className="pt-24 pb-20 bg-slate-50 min-h-screen">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header Action Bar */}
        <div className="flex justify-between items-center mb-10">
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            All Posts
            <span className="text-sm font-normal text-slate-500 bg-slate-200 px-2 py-0.5 rounded-full">{posts.length}</span>
          </h2>
          <button className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg shadow-md transition-all active:scale-95">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            <span>Create New Post</span>
          </button>
        </div>

        {/* Post List */}
        <div className="space-y-4">
          {posts.map((post) => (
            <div 
              key={post.id}
              className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all duration-200 group cursor-pointer"
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-lg font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">
                  {post.title}
                </h3>
                {post.tags && post.tags.length > 0 && (
                  <span className="text-xs font-medium px-2 py-1 bg-slate-100 text-slate-600 rounded-md">
                    {post.tags[0]}
                  </span>
                )}
              </div>
              
              <p className="text-slate-600 text-sm leading-relaxed mb-4 line-clamp-2">
                {post.excerpt}
              </p>
              
              <div className="flex items-center text-xs text-slate-400 font-mono gap-4">
                <span className="flex items-center gap-1">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {post.date}
                </span>
                <span className="flex items-center gap-1">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  {post.views} views
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Pagination */}
        <div className="mt-10 flex justify-center items-center gap-2">
           <button className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50">
             ← Previous
           </button>
           <button className="w-10 h-10 bg-indigo-600 text-white rounded-lg text-sm font-medium shadow-md">1</button>
           <button className="w-10 h-10 bg-white border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50">2</button>
           <button className="w-10 h-10 bg-white border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50">3</button>
           <span className="text-slate-400">...</span>
           <button className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 flex items-center gap-1">
             Next →
           </button>
        </div>

      </div>
    </div>
  );
};

export default PostList;
