import React, { useEffect } from 'react';
import { useParams, Navigate } from 'react-router-dom';

// Author page is rendered by backend Tera template at /author/:username
// This component is a fallback for SPA navigation - it redirects to the backend route
const AuthorPage: React.FC = () => {
  const { username } = useParams<{ username: string }>();

  useEffect(() => {
    if (username) {
      window.location.href = `/author/${encodeURIComponent(username)}`;
    }
  }, [username]);

  // Show loading while redirecting
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
    </div>
  );
};

export default AuthorPage;
