import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  fetchMutter,
  createMutter,
  updateMutter,
  CreateMutterDto,
  TranslatedMutter,
  translateMutter,
  publishMutterToPost,
} from '../services/api';

const MutterEditorPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [formData, setFormData] = useState<CreateMutterDto>({
    content: '',
    title: '',
  });
  const [translated, setTranslated] = useState<TranslatedMutter | null>(null);
  const [previewMode, setPreviewMode] = useState<'edit' | 'preview' | 'split'>('split');

  useEffect(() => {
    if (id) {
      loadMutter(parseInt(id, 10));
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
      setTranslated(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load mutter');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setLoading(true);

    try {
      if (id) {
        await updateMutter(parseInt(id, 10), formData);
        setNotice('Mutter updated');
      } else {
        const created = await createMutter(formData);
        navigate(`/admin/mutter-editor/${created.id}`);
        return;
      }
    } catch (err: any) {
      const serverMsg = err?.response?.data?.error;
      setError(serverMsg || (err instanceof Error ? err.message : 'Failed to save mutter'));
    } finally {
      setLoading(false);
    }
  };

  const handleTranslate = async () => {
    if (!formData.content.trim()) {
      setError('Write the mutter first');
      return;
    }

    setTranslating(true);
    setError(null);
    setNotice(null);

    try {
      const result = await translateMutter({
        title: formData.title,
        content: formData.content,
      });
      setTranslated(result);
      setNotice(`Translated with ${result.provider} / ${result.model}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to translate mutter');
    } finally {
      setTranslating(false);
    }
  };

  const handlePublish = async () => {
    if (!formData.content.trim()) {
      setError('Write the mutter first');
      return;
    }

    setPublishing(true);
    setError(null);
    setNotice(null);

    try {
      const post = await publishMutterToPost({
        title: formData.title,
        content: formData.content,
        translated_title: translated?.title,
        translated_excerpt: translated?.excerpt,
        translated_content: translated?.content,
        is_draft: true,
      });
      navigate(`/posts/${post.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to publish mutter');
    } finally {
      setPublishing(false);
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
    <div className="container mx-auto px-4 py-8 max-w-7xl space-y-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">{id ? 'Edit Mutter' : 'Create New Mutter'}</h1>
          <p className="text-gray-600 mt-2">
            Write in Cantonese if you want. Translate to polished Simplified Chinese and publish as a post draft.
          </p>
        </div>
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
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {notice && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
          {notice}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
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
            placeholder="Give your mutter a title if you want"
          />
        </div>

        <div className={`grid ${previewMode === 'split' ? 'grid-cols-2' : 'grid-cols-1'} gap-4`}>
          {previewMode !== 'preview' && (
            <div>
              <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-2">
                Mutter Content
              </label>
              <textarea
                id="content"
                name="content"
                value={formData.content}
                onChange={handleChange}
                rows={previewMode === 'split' ? 20 : 15}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono text-sm"
                placeholder="Write the raw mutter here"
              />
            </div>
          )}

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

        <div className="flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate('/mutters')}
            className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleTranslate}
            disabled={translating || publishing}
            className="px-6 py-2 bg-amber-500 text-white rounded-md hover:bg-amber-600 disabled:bg-gray-400"
          >
            {translating ? 'Translating...' : 'Translate to Post'}
          </button>
          <button
            type="button"
            onClick={handlePublish}
            disabled={publishing || translating}
            className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-gray-400"
          >
            {publishing ? 'Publishing...' : 'Publish to Posts'}
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

      {translated && (
        <section className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold">Translated Draft</h2>
              <p className="text-gray-600">
                {translated.provider} / {translated.model}
              </p>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">Suggested Title</p>
            <p className="text-xl font-semibold text-gray-900">{translated.title}</p>
          </div>

          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">Excerpt</p>
            <p className="text-gray-700">{translated.excerpt}</p>
          </div>

          <div>
            <p className="text-sm font-medium text-gray-500 mb-2">Content</p>
            <div className="prose max-w-none bg-gray-50 border border-gray-200 rounded-md px-4 py-3">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {translated.content}
              </ReactMarkdown>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

export default MutterEditorPage;
