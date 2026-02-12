import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const AdminPage: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
        <p className="text-gray-600">Welcome back, {user?.username || user?.email}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Create Post */}
        <Link
          to="/admin/editor"
          className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition"
        >
          <div className="flex items-center mb-4">
            <div className="bg-indigo-100 rounded-full p-3">
              <svg
                className="w-6 h-6 text-indigo-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
            </div>
          </div>
          <h2 className="text-xl font-bold mb-2">Create New Post</h2>
          <p className="text-gray-600">Write a new blog post</p>
        </Link>

        {/* Create Mutter */}
        <Link
          to="/admin/mutter-editor"
          className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition"
        >
          <div className="flex items-center mb-4">
            <div className="bg-purple-100 rounded-full p-3">
              <svg
                className="w-6 h-6 text-purple-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
            </div>
          </div>
          <h2 className="text-xl font-bold mb-2">Create New Mutter</h2>
          <p className="text-gray-600">Add a private thought</p>
        </Link>

        {/* Manage Posts */}
        <Link to="/posts" className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition">
          <div className="flex items-center mb-4">
            <div className="bg-green-100 rounded-full p-3">
              <svg
                className="w-6 h-6 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
          </div>
          <h2 className="text-xl font-bold mb-2">Manage Posts</h2>
          <p className="text-gray-600">View and edit your posts</p>
        </Link>

        {/* Manage Mutters */}
        <Link to="/mutters" className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition">
          <div className="flex items-center mb-4">
            <div className="bg-yellow-100 rounded-full p-3">
              <svg
                className="w-6 h-6 text-yellow-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
            </div>
          </div>
          <h2 className="text-xl font-bold mb-2">Manage Mutters</h2>
          <p className="text-gray-600">View your private thoughts</p>
        </Link>
      </div>

      {/* Quick Stats */}
      <div className="mt-8 bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold mb-4">Quick Stats</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-50 rounded p-4">
            <p className="text-gray-600 text-sm">Total Posts</p>
            <p className="text-2xl font-bold">-</p>
          </div>
          <div className="bg-gray-50 rounded p-4">
            <p className="text-gray-600 text-sm">Total Views</p>
            <p className="text-2xl font-bold">-</p>
          </div>
          <div className="bg-gray-50 rounded p-4">
            <p className="text-gray-600 text-sm">Drafts</p>
            <p className="text-2xl font-bold">-</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPage;
