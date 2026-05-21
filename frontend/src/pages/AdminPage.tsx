import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { AiSettings, fetchAiSettings, updateAiSettings, fetchMyPosts, updatePostAdmin, deletePostAdmin, deleteMutter, fetchMutters, Post, Mutter } from '../services/api';

const AdminPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [settings, setSettings] = useState<AiSettings | null>(null);
  const [provider, setProvider] = useState('moonshot');
  const [model, setModel] = useState('moonshot-v1-8k');
  const [baseUrl, setBaseUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Posts management state
  const [posts, setPosts] = useState<Post[]>([]);
  const [mutters, setMutters] = useState<Mutter[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [muttersLoading, setMuttersLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'posts' | 'mutters'>('posts');
  const [postsFilter, setPostsFilter] = useState<'all' | 'drafts' | 'published'>('all');
  const [postsPage, setPostsPage] = useState(1);
  const POSTS_PER_PAGE = 10;

  // Reset page when filter changes
  useEffect(() => {
    setPostsPage(1);
  }, [postsFilter]);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        setLoading(true);
        const data = await fetchAiSettings();
        setSettings(data);
        setProvider(data.provider);
        setModel(data.model);
        setBaseUrl(data.base_url || '');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load AI settings');
      } finally {
        setLoading(false);
      }
    };

    const loadPosts = async () => {
      try {
        setPostsLoading(true);
        const allPosts = await fetchMyPosts();
        // Filter only actual posts (not mutters) - after migration, API should only return posts
        setPosts(allPosts.filter(p => (p as any).content_type === 'post' || !(p as any).content_type));
      } catch (err) {
        console.error('Failed to load posts:', err);
      } finally {
        setPostsLoading(false);
      }
    };

    const loadMutters = async () => {
      try {
        setMuttersLoading(true);
        const response = await fetchMutters(1, 100); // Get up to 100 mutters
        setMutters(response.mutters);
      } catch (err) {
        console.error('Failed to load mutters:', err);
      } finally {
        setMuttersLoading(false);
      }
    };

    loadSettings();
    loadPosts();
    loadMutters();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setNotice(null);

    try {
      const payload = {
        provider,
        model,
        base_url: baseUrl.trim() || undefined,
        ...(apiKey.trim() ? { api_key: apiKey.trim() } : {}),
      };

      const updated = await updateAiSettings(payload);
      setSettings(updated);
      setProvider(updated.provider);
      setModel(updated.model);
      setBaseUrl(updated.base_url || '');
      setApiKey('');
      setNotice('AI settings updated');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save AI settings');
    } finally {
      setSaving(false);
    }
  };

  // Filter posts by type
  const draftPosts = posts.filter(p => p.is_draft);
  const publishedPosts = posts.filter(p => !p.is_draft);

  const handlePublish = async (id: number) => {
    if (!confirm('确定要发布这篇文章吗？')) return;
    try {
      await updatePostAdmin(id, { is_draft: false });
      setPosts(prev => prev.map(p => p.id === id ? { ...p, is_draft: false } : p));
    } catch (err) {
      alert('发布失败: ' + (err instanceof Error ? err.message : '未知错误'));
    }
  };

  const handleDeletePost = async (id: number) => {
    if (!confirm('确定要删除这篇文章吗？此操作不可恢复！')) return;
    try {
      await deletePostAdmin(id);
      setPosts(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      alert('删除失败: ' + (err instanceof Error ? err.message : '未知错误'));
    }
  };

  const handleDeleteMutter = async (id: number) => {
    if (!confirm('确定要删除这条 mutter 吗？此操作不可恢复！')) return;
    try {
      await deleteMutter(id);
      setMutters(prev => prev.filter(m => m.id !== id));
    } catch (err) {
      alert('删除失败: ' + (err instanceof Error ? err.message : '未知错误'));
    }
  };

  // Displayed content based on active tab
  const displayedPostsForTab = posts
    .filter(p => postsFilter === 'all' ||
      (postsFilter === 'drafts' && p.is_draft) ||
      (postsFilter === 'published' && !p.is_draft))
    .slice((postsPage - 1) * POSTS_PER_PAGE, postsPage * POSTS_PER_PAGE);

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <div className="mb-2">
        <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
        <p className="text-gray-600">Signed in as {user?.email}</p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <Link
          to="/dashboard/editor"
          className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition"
        >
          <h2 className="text-xl font-bold mb-2">Create New Post</h2>
          <p className="text-gray-600">Write and manage a long-form article.</p>
        </Link>

        <Link
          to="/dashboard/mutter-editor"
          className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition"
        >
          <h2 className="text-xl font-bold mb-2">Create New Mutter</h2>
          <p className="text-gray-600">Draft a quick thought and push it into posts.</p>
        </Link>

        <Link
          to="/posts"
          className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition"
        >
          <h2 className="text-xl font-bold mb-2">View Posts</h2>
          <p className="text-gray-600">Review public posts.</p>
        </Link>

        <Link
          to="/mutters"
          className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition"
        >
          <h2 className="text-xl font-bold mb-2">View Mutters</h2>
          <p className="text-gray-600">Review private mutters.</p>
        </Link>
      </div>

      {/* Manage All Posts */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold mb-4">Manage Posts</h2>

        {/* Filter Tabs */}
        <div className="flex gap-4 mb-4 border-b">
          <button
            onClick={() => setPostsFilter('all')}
            className={`pb-2 px-1 font-medium ${postsFilter === 'all' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500'}`}
          >
            All Posts ({posts.length})
          </button>
          <button
            onClick={() => setPostsFilter('drafts')}
            className={`pb-2 px-1 font-medium ${postsFilter === 'drafts' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500'}`}
          >
            Drafts ({draftPosts.length})
          </button>
          <button
            onClick={() => setPostsFilter('published')}
            className={`pb-2 px-1 font-medium ${postsFilter === 'published' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500'}`}
          >
            Published ({publishedPosts.length})
          </button>
        </div>

        {postsLoading ? (
          <div className="text-gray-500">Loading...</div>
        ) : (
          <>
            <div className="space-y-3">
              {posts
                .filter(p => postsFilter === 'all' ||
                  (postsFilter === 'drafts' && p.is_draft) ||
                  (postsFilter === 'published' && !p.is_draft))
                .slice((postsPage - 1) * POSTS_PER_PAGE, postsPage * POSTS_PER_PAGE)
                .map(post => (
                <div key={post.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate">
                      {post.title || 'Untitled'}
                      {post.is_draft && (
                        <span className="ml-2 text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">草稿</span>
                      )}
                      {post.is_private && (
                        <span className="ml-2 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">私密</span>
                      )}
                    </h3>
                    <p className="text-sm text-gray-500 truncate">{post.slug}</p>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <Link
                      to={`/dashboard/editor/${post.id}`}
                      className="px-3 py-1 text-sm bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200"
                    >
                      编辑
                    </Link>
                    {post.is_draft ? (
                      <button
                        onClick={() => handlePublish(post.id)}
                        className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200"
                      >
                        发布
                      </button>
                    ) : (
                      <Link
                        to={`/posts/${post.slug}`}
                        target="_blank"
                        className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                      >
                        查看
                      </Link>
                    )}
                    <button
                      onClick={() => handleDeletePost(post.id)}
                      className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
                    >
                      删除
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {(() => {
              const filteredPosts = posts.filter(p => postsFilter === 'all' ||
                (postsFilter === 'drafts' && p.is_draft) ||
                (postsFilter === 'published' && !p.is_draft));
              const totalPages = Math.ceil(filteredPosts.length / POSTS_PER_PAGE);
              if (totalPages <= 1) return null;

              return (
                <div className="flex items-center justify-center gap-2 mt-6 pt-4 border-t">
                  <button
                    onClick={() => setPostsPage(p => Math.max(1, p - 1))}
                    disabled={postsPage === 1}
                    className="px-3 py-1 text-sm bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    上一页
                  </button>
                  <span className="text-sm text-gray-600">
                    {postsPage} / {totalPages}
                  </span>
                  <button
                    onClick={() => setPostsPage(p => Math.min(totalPages, p + 1))}
                    disabled={postsPage === totalPages}
                    className="px-3 py-1 text-sm bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    下一页
                  </button>
                </div>
              );
            })()}
          </>
        )}
      </div>

      {/* Drafts Management */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold mb-4">Drafts Management</h2>

        {/* Tabs */}
        <div className="flex gap-4 mb-4 border-b">
          <button
            onClick={() => setActiveTab('posts')}
            className={`pb-2 px-1 font-medium ${activeTab === 'posts' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500'}`}
          >
            Posts ({draftPosts.length} drafts, {publishedPosts.length} published)
          </button>
          <button
            onClick={() => setActiveTab('mutters')}
            className={`pb-2 px-1 font-medium ${activeTab === 'mutters' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500'}`}
          >
            Mutters ({mutters.length} total)
          </button>
        </div>

        {activeTab === 'posts' ? (
          postsLoading ? (
            <div className="text-gray-500">Loading...</div>
          ) : displayedPostsForTab.length === 0 ? (
            <p className="text-gray-500">暂无内容</p>
          ) : (
            <div className="space-y-3">
              {displayedPostsForTab.map(post => (
                <div key={post.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate">
                      {post.title || 'Untitled'}
                      {post.is_draft && (
                        <span className="ml-2 text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">草稿</span>
                      )}
                      {post.is_private && (
                        <span className="ml-2 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">私密</span>
                      )}
                    </h3>
                    <p className="text-sm text-gray-500 truncate">{post.slug}</p>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <Link
                      to={`/dashboard/editor/${post.id}`}
                      className="px-3 py-1 text-sm bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200"
                    >
                      编辑
                    </Link>
                    {post.is_draft && (
                      <button
                        onClick={() => handlePublish(post.id)}
                        className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200"
                      >
                        发布
                      </button>
                    )}
                    <button
                      onClick={() => handleDeletePost(post.id)}
                      className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
                    >
                      删除
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          muttersLoading ? (
            <div className="text-gray-500">Loading...</div>
          ) : mutters.length === 0 ? (
            <p className="text-gray-500">暂无 mutters</p>
          ) : (
            <div className="space-y-3">
              {mutters.map(mutter => (
                <div key={mutter.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate">
                      {mutter.title || 'Untitled'}
                      {mutter.is_private !== false && (
                        <span className="ml-2 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">私密</span>
                      )}
                    </h3>
                    <p className="text-sm text-gray-500 truncate">{mutter.slug}</p>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <Link
                      to={`/dashboard/mutter-editor/${mutter.id}`}
                      className="px-3 py-1 text-sm bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200"
                    >
                      编辑
                    </Link>
                    <button
                      onClick={() => handleDeleteMutter(mutter.id)}
                      className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
                    >
                      删除
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>

      {/* AI Provider Settings - Admin only */}
      {user?.is_admin && (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold">AI Provider Settings</h2>
            <p className="text-gray-600 mt-1">
              Configure the provider, model, gateway base URL, and stored API key for mutter translation.
            </p>
          </div>
          {settings && (
            <div className="text-right text-sm text-gray-500">
              <p>Stored key: {settings.has_api_key ? 'Yes' : 'No'}</p>
              <p>Updated: {new Date(settings.updated_at).toLocaleString()}</p>
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {notice && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4">
            {notice}
          </div>
        )}

        {loading ? (
          <div className="text-gray-500">Loading AI settings...</div>
        ) : (
          <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <label htmlFor="provider" className="block text-sm font-medium text-gray-700 mb-2">
                Provider
              </label>
              <input
                id="provider"
                type="text"
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                placeholder="moonshot / glm / minimax / openai / claude"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            <div>
              <label htmlFor="model" className="block text-sm font-medium text-gray-700 mb-2">
                Model
              </label>
              <input
                id="model"
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="moonshot-v1-8k"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            <div className="lg:col-span-2">
              <label htmlFor="baseUrl" className="block text-sm font-medium text-gray-700 mb-2">
                Base URL
              </label>
              <input
                id="baseUrl"
                type="text"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="https://your-ai-gateway.example.com/v1"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            <div className="lg:col-span-2">
              <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700 mb-2">
                API Key
              </label>
              <input
                id="apiKey"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={settings?.has_api_key ? 'Leave blank to keep the current key' : 'Paste a new API key'}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            <div className="lg:col-span-2 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-gray-400"
              >
                {saving ? 'Saving...' : 'Save AI Settings'}
              </button>
            </div>
          </form>
        )}
      </div>
      )}
    </div>
  );
};

export default AdminPage;
