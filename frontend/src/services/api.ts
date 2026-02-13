import axios, { AxiosResponse } from 'axios';

// API 基础配置
// Use import.meta.env.BASE_URL to respect the base path set in vite.config.ts
const API_BASE = `${import.meta.env.BASE_URL}api`;

// Axios 实例
const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // 发送 cookies
});

// 响应类型定义
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// 文章相关类型
export interface Post {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  content?: string;
  content_type: string;
  is_draft: boolean;
  is_private: boolean;
  is_ai_generated: boolean;
  view_count: number;
  created_at: string;
  updated_at: string;
}

export interface PostsResponse {
  posts: Post[];
  total: number;
  page: number;
  limit: number;
}

export interface CreatePostDto {
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  is_draft?: boolean;
  is_ai_generated?: boolean;
  tags?: string[];
}

export interface UpdatePostDto extends Partial<CreatePostDto> {}

// Mutter 相关类型
export interface Mutter {
  id: number;
  title?: string;
  slug: string;
  content: string;
  view_count: number;
  created_at: string;
  updated_at: string;
  is_private?: boolean;
}

export interface MuttersResponse {
  mutters: Mutter[];
  total: number;
  page: number;
  limit: number;
}

export interface CreateMutterDto {
  content: string;
  title?: string;
}

// 用户类型
export interface User {
  user_id: string;
  email: string;
  username: string;
  is_admin: boolean;
  picture?: string | null;  // Add picture field for avatar
}

// 用户响应类型 (backend returns this)
export interface UserResponse {
  authenticated: boolean;
  user: User | null;
}

// 标签类型
export interface Tag {
  name: string;
  count: number;
}

// ==================== 文章 API ====================

/**
 * 获取文章列表
 */
export const fetchPosts = async (
  page: number = 1,
  limit: number = 20,
  search?: string,
  tag?: string
): Promise<PostsResponse> => {
  const params = new URLSearchParams();
  params.append('page', page.toString());
  params.append('limit', limit.toString());
  if (search) params.append('search', search);
  if (tag) params.append('tag', tag);

  const response: AxiosResponse<ApiResponse<PostsResponse>> = await api.get(
    `/posts?${params.toString()}`
  );

  if (response.data.success && response.data.data) {
    return response.data.data;
  }
  throw new Error(response.data.error || 'Failed to fetch posts');
};

/**
 * 获取单篇文章
 */
export const fetchPost = async (id: number): Promise<Post> => {
  const response: AxiosResponse<ApiResponse<Post>> = await api.get(`/posts/${id}`);

  if (response.data.success && response.data.data) {
    return response.data.data;
  }
  throw new Error(response.data.error || 'Failed to fetch post');
};

/**
 * 创建文章
 */
export const createPost = async (data: CreatePostDto): Promise<Post> => {
  const response: AxiosResponse<ApiResponse<Post>> = await api.post('/posts', data);

  if (response.data.success && response.data.data) {
    return response.data.data;
  }
  throw new Error(response.data.error || 'Failed to create post');
};

/**
 * 更新文章
 */
export const updatePost = async (id: number, data: UpdatePostDto): Promise<Post> => {
  const response: AxiosResponse<ApiResponse<Post>> = await api.put(`/posts/${id}`, data);

  if (response.data.success && response.data.data) {
    return response.data.data;
  }
  throw new Error(response.data.error || 'Failed to update post');
};

/**
 * 删除文章
 */
export const deletePost = async (id: number): Promise<void> => {
  const response: AxiosResponse<ApiResponse<void>> = await api.delete(`/posts/${id}`);

  if (!response.data.success) {
    throw new Error(response.data.error || 'Failed to delete post');
  }
};

// ==================== Mutters API ====================

/**
 * 获取 Mutters 列表
 */
export const fetchMutters = async (page: number = 1, limit: number = 50): Promise<MuttersResponse> => {
  const params = new URLSearchParams();
  params.append('page', page.toString());
  params.append('limit', limit.toString());

  const response: AxiosResponse<ApiResponse<MuttersResponse>> = await api.get(
    `/mutters?${params.toString()}`
  );

  if (response.data.success && response.data.data) {
    return response.data.data;
  }
  throw new Error(response.data.error || 'Failed to fetch mutters');
};

/**
 * 获取单个 Mutter
 */
export const fetchMutter = async (id: number): Promise<Mutter> => {
  const response: AxiosResponse<ApiResponse<Mutter>> = await api.get(`/mutters/${id}`);

  if (response.data.success && response.data.data) {
    return response.data.data;
  }
  throw new Error(response.data.error || 'Failed to fetch mutter');
};

/**
 * 创建 Mutter
 */
export const createMutter = async (data: CreateMutterDto): Promise<Mutter> => {
  const response: AxiosResponse<ApiResponse<Mutter>> = await api.post('/mutters', data);

  if (response.data.success && response.data.data) {
    return response.data.data;
  }
  throw new Error(response.data.error || 'Failed to create mutter');
};

/**
 * 更新 Mutter
 */
export const updateMutter = async (id: number, data: Partial<CreateMutterDto>): Promise<Mutter> => {
  const response: AxiosResponse<ApiResponse<Mutter>> = await api.put(`/mutters/${id}`, data);

  if (response.data.success && response.data.data) {
    return response.data.data;
  }
  throw new Error(response.data.error || 'Failed to update mutter');
};

/**
 * 删除 Mutter
 */
export const deleteMutter = async (id: number): Promise<void> => {
  const response: AxiosResponse<ApiResponse<void>> = await api.delete(`/mutters/${id}`);

  if (!response.data.success) {
    throw new Error(response.data.error || 'Failed to delete mutter');
  }
};

// ==================== 标签 API ====================

/**
 * 获取所有标签
 */
export const fetchTags = async (): Promise<Tag[]> => {
  const response: AxiosResponse<ApiResponse<Tag[]>> = await api.get('/tags');

  if (response.data.success && response.data.data) {
    return response.data.data;
  }
  throw new Error(response.data.error || 'Failed to fetch tags');
};

// ==================== 认证 API ====================

/**
 * 获取当前用户信息
 */
export const getCurrentUser = async (): Promise<UserResponse> => {
  try {
    const response: AxiosResponse<UserResponse> = await api.get('/user/me');

    // Backend returns UserResponse directly, not wrapped in ApiResponse
    return response.data;
  } catch (error) {
    // Return not authenticated if any error
    return { authenticated: false, user: null };
  }
};

/**
 * 登出
 */
export const logout = async (): Promise<void> => {
  // 后端会清除 cookie
  await axios.get(`${import.meta.env.BASE_URL}auth/logout`, { withCredentials: true });
  // 刷新页面 - Fix: Use BASE_URL for subdirectory deployment
  window.location.href = import.meta.env.BASE_URL || '/';
};

// ==================== 上传 API ====================

/**
 * 上传图片
 */
export const uploadImage = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await api.post('/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  if (response.data.success && response.data.data) {
    return response.data.data.url;
  }
  throw new Error(response.data.error || 'Failed to upload image');
};

export default api;
