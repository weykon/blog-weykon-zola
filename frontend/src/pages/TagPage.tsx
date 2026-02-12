import React, { useEffect, useState } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { fetchPosts, Post } from '../services/api';

const TagPage: React.FC = () => {
  const { tag } = useParams<{ tag: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState(1);

  const page = parseInt(searchParams.get('page') || '1');

  useEffect(() => {
    const loadPosts = async () => {
      if (!tag) {
        setError('Invalid tag');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const data = await fetchPosts(page, 20, undefined, tag);
        setPosts(data.posts);
        setTotalPages(Math.ceil(data.total / data.limit));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load posts');
      } finally {
        setLoading(false);
      }
    };

    loadPosts();
  }, [page, tag]);

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
      <div className="mb-8">
        <Link to="/posts" className="text-indigo-600 hover:text-indigo-800 mb-2 inline-block">
          ← All posts
        </Link>
        <h1 className="text-3xl font-bold">
          Posts tagged: <span className="text-indigo-600">#{tag}</span>
        </h1>
        <p className="text-gray-600 mt-2">{posts.length} posts found</p>
      </div>

      {posts.length === 0 ? (
        <p className="text-gray-600">No posts found with this tag.</p>
      ) : (
        <>
          <div className="space-y-6">
            {posts.map((post) => (
              <article key={post.id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition">
                <Link to={`/posts/${post.id}`}>
                  <h2 className="text-2xl font-bold text-gray-900 hover:text-indigo-600 mb-2">
                    {post.title}
                  </h2>
                </Link>

                <div className="text-sm text-gray-500 mb-3">
                  <span>{new Date(post.created_at).toLocaleDateString()}</span>
                  {post.is_ai_generated && (
                    <span className="ml-3 px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs">
                      AI Generated
                    </span>
                  )}
                </div>

                <p className="text-gray-700 mb-4">{post.excerpt}</p>

                <div className="flex items-center justify-between">
                  <Link
                    to={`/posts/${post.id}`}
                    className="text-indigo-600 hover:text-indigo-800 font-medium"
                  >
                    Read more →
                  </Link>
                  <span className="text-gray-500 text-sm">{post.view_count} views</span>
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

export default TagPage;
