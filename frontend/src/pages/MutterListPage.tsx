import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { fetchMutters, deleteMutter, Mutter } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const MutterListPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [mutters, setMutters] = useState<Mutter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [totalPages, setTotalPages] = useState(1);
  const { user } = useAuth();

  const page = parseInt(searchParams.get('page') || '1');

  useEffect(() => {
    const loadMutters = async () => {
      try {
        setLoading(true);
        setError(null);
        setNeedsAuth(false);
        const data = await fetchMutters(page, 50);
        setMutters(data.mutters);
        setTotalPages(Math.ceil(data.total / data.limit));
      } catch (err: any) {
        if (err?.response?.status === 401 || err?.message?.includes('401')) {
          setNeedsAuth(true);
        } else {
          setError(err instanceof Error ? err.message : 'Failed to load mutters');
        }
      } finally {
        setLoading(false);
      }
    };

    loadMutters();
  }, [page]);

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', newPage.toString());
    setSearchParams(params);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (needsAuth) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Mutters</h1>
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <div className="text-5xl mb-4">🔒</div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">需要登录才能查看</h2>
          <p className="text-gray-500 mb-6">
            Mutters 是私密的碎碎念空间，登录后可以查看和创建属于你自己的 mutter。
          </p>
          <Link
            to="/login"
            className="inline-block px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium"
          >
            去登录
          </Link>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          Error: {error}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Mutters</h1>
          <p className="text-sm text-gray-500 mt-1">
            Unauthenticated users see public mutters only; login to see your private ones.
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-500">Total: {mutters.length}</span>
          {user?.email === 'weykonkong@gmail.com' && (
            <Link
              to="/admin/mutter-editor"
              className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition"
            >
              + New Mutter
            </Link>
          )}
        </div>
      </div>

      {mutters.length === 0 ? (
        <p className="text-gray-600">No mutters found.</p>
      ) : (
        <>
          <div className="space-y-4">
            {mutters.map((mutter) => (
              <article
                key={mutter.id}
                className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition"
              >
                <Link to={`/mutters/${mutter.id}`}>
                  {mutter.title && (
                    <h2 className="text-xl font-bold text-gray-900 hover:text-indigo-600 mb-2">
                      {mutter.title}
                    </h2>
                  )}

                  <p className="text-gray-700 mb-3 line-clamp-3">{mutter.content}</p>
                </Link>

                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span>{new Date(mutter.created_at).toLocaleDateString()}</span>
                  <div className="flex items-center space-x-3">
                    <span>{mutter.view_count} views</span>
                    {user?.email === 'weykonkong@gmail.com' && (
                      <>
                        <Link
                          to={`/admin/mutter-editor/${mutter.id}`}
                          className="text-indigo-500 hover:text-indigo-700"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Edit
                        </Link>
                        <button
                          onClick={async (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (window.confirm('Delete this mutter?')) {
                              try {
                                await deleteMutter(mutter.id);
                                setMutters((prev) => prev.filter((m) => m.id !== mutter.id));
                              } catch (err) {
                                alert('Failed to delete mutter');
                              }
                            }
                          }}
                          className="text-red-500 hover:text-red-700"
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center mt-8 space-x-2">
              <button
                onClick={() => handlePageChange(page - 1)}
                disabled={page <= 1}
                className="px-4 py-2 bg-indigo-600 text-white rounded disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-indigo-700"
              >
                Previous
              </button>

              <span className="px-4 py-2">
                Page {page} of {totalPages}
              </span>

              <button
                onClick={() => handlePageChange(page + 1)}
                disabled={page >= totalPages}
                className="px-4 py-2 bg-indigo-600 text-white rounded disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-indigo-700"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default MutterListPage;
