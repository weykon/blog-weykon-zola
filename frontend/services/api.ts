/// API service for backend communication
import { Post, Mutter } from '../types';

// API base URL - will be configured based on environment
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: string | null;
}

interface PostsResponse {
  posts: Post[];
  total: number;
  page: number;
  limit: number;
}

interface MuttersResponse {
  mutters: Mutter[];
  total: number;
  page: number;
  limit: number;
}

interface TagResponse {
  name: string;
  count: number;
}

interface UserInfo {
  user_id: string;
  email: string;
  username: string;
  is_admin: boolean;
  picture: string | null;
}

interface UserResponse {
  authenticated: boolean;
  user: UserInfo | null;
}

class ApiService {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
        credentials: 'include', // Important for cookie-based auth
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('API request failed:', error);
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Posts
  async getPosts(page: number = 1, limit: number = 20): Promise<ApiResponse<PostsResponse>> {
    return this.request<PostsResponse>(`/api/posts?page=${page}&limit=${limit}`);
  }

  async getPost(id: string): Promise<ApiResponse<Post>> {
    return this.request<Post>(`/api/posts/${id}`);
  }

  // Mutters
  async getMutters(page: number = 1, limit: number = 50): Promise<ApiResponse<MuttersResponse>> {
    return this.request<MuttersResponse>(`/api/mutters?page=${page}&limit=${limit}`);
  }

  async getMutter(id: string): Promise<ApiResponse<Mutter>> {
    return this.request<Mutter>(`/api/mutters/${id}`);
  }

  async createMutter(content: string, title?: string): Promise<ApiResponse<Mutter>> {
    return this.request<Mutter>('/api/mutters', {
      method: 'POST',
      body: JSON.stringify({ content, title }),
    });
  }

  // Tags
  async getTags(): Promise<ApiResponse<TagResponse[]>> {
    return this.request<TagResponse[]>('/api/tags');
  }

  // User
  async getCurrentUser(): Promise<UserResponse> {
    const response = await fetch(`${this.baseUrl}/api/user/me`, {
      credentials: 'include',
    });
    return response.json();
  }

  // Auth
  async logout(): Promise<void> {
    await fetch(`${this.baseUrl}/auth/logout`, {
      credentials: 'include',
    });
    window.location.href = this.baseUrl || '/';
  }
}

// Export singleton instance
export const api = new ApiService();
export type { Post, Mutter, UserInfo, UserResponse, TagResponse };
