import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { fetchMutter, createMutter, updateMutter, CreateMutterDto } from '../services/api';

const MutterEditorPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<CreateMutterDto>({
    content: '',
    title: '',
  });
  const [previewMode, setPreviewMode] = useState<'edit' | 'preview' | 'split'>('split');

  useEffect(() => {
    if (id) {
      loadMutter(parseInt(id));
    }
  }, [id]);

  const loadMutter = async (mutterId: number) => {
    try {
      setLoading(true);
      const mutter = await fetchMutter(mutterId);
      setFormData({
        title: mutter.title || '',
        content: mutter.content,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load mutter');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (id) {
        await updateMutter(parseInt(id), formData);
        navigate('/mutters');
      } else {
        await createMutter(formData);
        navigate('/mutters');
      }
    } catch (err: any) {
      const serverMsg = err?.response?.data?.error;
      setError(serverMsg || (err instanceof Error ? err.message : 'Failed to save mutter'));
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  if (loading && id) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">{id ? 'Edit Mutter' : 'Create New Mutter'}</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPreviewMode('edit')}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
              previewMode === 'edit'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Edit
          </button>
          <button
            onClick={() => setPreviewMode('split')}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
              previewMode === 'split'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Split
          </button>
          <button
            onClick={() => setPreviewMode('preview')}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
              previewMode === 'preview'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Preview
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Title (Optional) */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
            Title (Optional)
          </label>
          <input
            type="text"
            id="title"
            name="title"
            value={formData.title}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            placeholder="Give your mutter a title (optional)"
          />
        </div>

        {/* Content with Preview */}
        <div className={`grid ${previewMode === 'split' ? 'grid-cols-2' : 'grid-cols-1'} gap-4`}>
          {/* Editor */}
          {previewMode !== 'preview' && (
            <div>
              <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-2">
                Content {previewMode === 'split' && '(Markdown)'}
              </label>
              <textarea
                id="content"
                name="content"
                value={formData.content}
                onChange={handleChange}
                rows={previewMode === 'split' ? 20 : 15}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono text-sm"
                placeholder="What's on your mind? (Supports Markdown)"
              />
            </div>
          )}

          {/* Preview */}
          {previewMode !== 'edit' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Preview
              </label>
              <div className="w-full min-h-[300px] px-4 py-2 border border-gray-300 rounded-md bg-gray-50">
                {formData.content ? (
                  <div className="prose prose-sm max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {formData.content}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <p className="text-gray-400 italic">Preview will appear here...</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => navigate('/mutters')}
            className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-gray-400"
          >
            {loading ? 'Saving...' : id ? 'Update Mutter' : 'Create Mutter'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default MutterEditorPage;
