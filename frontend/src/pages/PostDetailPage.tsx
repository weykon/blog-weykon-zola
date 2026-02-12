import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { fetchPost, Post } from '../services/api';

const PostDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadPost = async () => {
      if (!id) {
        setError('Invalid post URL');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        // Parse ID directly from URL parameter
        const postId = parseInt(id);
        if (isNaN(postId)) {
          throw new Error('Invalid post ID');
        }
        const data = await fetchPost(postId);
        setPost(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load post');
      } finally {
        setLoading(false);
      }
    };

    loadPost();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error || 'Post not found'}
        </div>
        <Link to="/posts" className="text-indigo-600 hover:text-indigo-800">
          ← Back to posts
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Link to="/posts" className="text-indigo-600 hover:text-indigo-800 mb-4 inline-block">
        ← Back to posts
      </Link>

      <article className="bg-white rounded-lg shadow-md p-8">
        <header className="mb-6">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">{post.title}</h1>

          <div className="flex items-center text-sm text-gray-600 space-x-4">
            <span>{new Date(post.created_at).toLocaleDateString()}</span>
            {post.is_ai_generated && (
              <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs">
                AI Generated
              </span>
            )}
            {post.is_draft && (
              <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs">
                Draft
              </span>
            )}
            <span>{post.view_count} views</span>
          </div>
        </header>

        <div
          className="prose prose-lg max-w-none"
          dangerouslySetInnerHTML={{ __html: post.content || post.excerpt }}
        />

        <footer className="mt-8 pt-6 border-t border-gray-200">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">
              Last updated: {new Date(post.updated_at).toLocaleDateString()}
            </span>
            <button
              onClick={() => navigate(-1)}
              className="text-indigo-600 hover:text-indigo-800"
            >
              Go back
            </button>
          </div>
        </footer>
      </article>
    </div>
  );
};

export default PostDetailPage;
