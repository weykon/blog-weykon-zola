import React from 'react';
import { Link } from 'react-router-dom';

interface AuthorCardProps {
  authorId?: number;
  username: string;
  picture?: string | null;
  postCount?: number;
  className?: string;
}

const AuthorCard: React.FC<AuthorCardProps> = ({
  authorId,
  username,
  picture,
  postCount,
  className = '',
}) => {
  return (
    <Link
      to={authorId ? `/author/${username}` : '#'}
      className={`flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition ${className}`}
    >
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm overflow-hidden">
        {picture ? (
          <img
            src={picture}
            alt={username}
            className="w-full h-full object-cover"
          />
        ) : (
          username.charAt(0).toUpperCase()
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900 truncate">{username}</p>
        {postCount !== undefined && (
          <p className="text-sm text-gray-500">
            {postCount} {postCount === 1 ? 'post' : 'posts'}
          </p>
        )}
      </div>
    </Link>
  );
};

export default AuthorCard;
