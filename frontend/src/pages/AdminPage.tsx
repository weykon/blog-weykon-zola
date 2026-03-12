import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { AiSettings, fetchAiSettings, updateAiSettings } from '../services/api';

const AdminPage: React.FC = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<AiSettings | null>(null);
  const [provider, setProvider] = useState('moonshot');
  const [model, setModel] = useState('moonshot-v1-8k');
  const [baseUrl, setBaseUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

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

    loadSettings();
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

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <div className="mb-2">
        <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
        <p className="text-gray-600">Signed in as {user?.email}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <Link
          to="/admin/editor"
          className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition"
        >
          <h2 className="text-xl font-bold mb-2">Create New Post</h2>
          <p className="text-gray-600">Write and manage a long-form article.</p>
        </Link>

        <Link
          to="/admin/mutter-editor"
          className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition"
        >
          <h2 className="text-xl font-bold mb-2">Create New Mutter</h2>
          <p className="text-gray-600">Draft a quick thought and push it into posts.</p>
        </Link>

        <Link
          to="/posts"
          className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition"
        >
          <h2 className="text-xl font-bold mb-2">Manage Posts</h2>
          <p className="text-gray-600">Review public posts and drafts.</p>
        </Link>

        <Link
          to="/mutters"
          className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition"
        >
          <h2 className="text-xl font-bold mb-2">Manage Mutters</h2>
          <p className="text-gray-600">Review private mutters and AI-ready notes.</p>
        </Link>
      </div>

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
    </div>
  );
};

export default AdminPage;
