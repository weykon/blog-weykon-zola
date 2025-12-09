import { ReactNode } from 'react';

export interface NavItem {
  label: string;
  id: string; // Changed from href to id for internal routing
}

export interface FeatureItem {
  title: string;
  description: string;
  icon: ReactNode;
  tags?: string[];
}

export interface Post {
  id: string;
  title: string;
  excerpt: string;
  date: string;
  views: number;
  tags?: string[];
}

export interface Mutter {
  id: string;
  content: string;
  date: string;
  charCount: number;
  views: number;
}
