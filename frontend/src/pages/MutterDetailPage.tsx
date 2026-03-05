import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { fetchMutter, deleteMutter, Mutter } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const MutterDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [mutter, setMutter] = useState<Mutter | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadMutter = async () => {
      if (!id) {
        setError('Invalid mutter URL');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const data = await fetchMutter(parseInt(id));
        setMutter(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load mutter');
      } finally {
        setLoading(false);
      }
    };

    loadMutter();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error || !mutter) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error || 'Mutter not found'}
        </div>
        <Link to="/mutters" className="text-indigo-600 hover:text-indigo-800">
          ← Back to mutters
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Link to="/mutters" className="text-indigo-600 hover:text-indigo-800 mb-4 inline-block">
        ← Back to mutters
      </Link>

      <article className="bg-white rounded-lg shadow-md p-8">
        {mutter.title && (
          <header className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">{mutter.title}</h1>
            <div className="flex items-center text-sm text-gray-600 space-x-4">
              <span>{new Date(mutter.created_at).toLocaleDateString()}</span>
              <span>{mutter.view_count} views</span>
              {mutter.is_private && (
                <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs">Private</span>
              )}
            </div>
          </header>
        )}

        <div className="prose prose-lg max-w-none whitespace-pre-wrap">{mutter.content}</div>

        <footer className="mt-8 pt-6 border-t border-gray-200">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">
              Last updated: {new Date(mutter.updated_at).toLocaleDateString()}
            </span>
            <div className="flex items-center space-x-4">
              {user?.email === 'weykonkong@gmail.com' && (
                <>
                  <Link
                    to={`/admin/mutter-editor/${mutter.id}`}
                    className="text-indigo-600 hover:text-indigo-800"
                  >
                    Edit
                  </Link>
                  <button
                    onClick={async () => {
                      if (window.confirm('Delete this mutter?')) {
                        try {
                          await deleteMutter(mutter.id);
                          navigate('/mutters');
                        } catch {
                          alert('Failed to delete mutter');
                        }
                      }
                    }}
                    className="text-red-600 hover:text-red-800"
                  >
                    Delete
                  </button>
                </>
              )}
              <button
                onClick={() => navigate(-1)}
                className="text-indigo-600 hover:text-indigo-800"
              >
                Go back
              </button>
            </div>
          </div>
        </footer>
      </article>
    </div>
  );
};

export default MutterDetailPage;
