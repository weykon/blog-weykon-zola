import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './src/contexts/AuthContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import AdminRoute from './src/components/AdminRoute';

// 页面组件
import HomePage from './src/pages/HomePage';
import PostListPage from './src/pages/PostListPage';
import PostDetailPage from './src/pages/PostDetailPage';
import MutterListPage from './src/pages/MutterListPage';
import MutterDetailPage from './src/pages/MutterDetailPage';
import MutterEditorPage from './src/pages/MutterEditorPage';
import TagPage from './src/pages/TagPage';
import LoginPage from './src/pages/LoginPage';
import AdminPage from './src/pages/AdminPage';
import EditorPage from './src/pages/EditorPage';

function App() {
  return (
    <BrowserRouter basename="/">
      <AuthProvider>
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
          <Navbar />
          <main className="flex-grow pt-20">
            <Routes>
              {/* 公开路由 */}
              <Route path="/" element={<HomePage />} />
              <Route path="/posts" element={<PostListPage />} />
              <Route path="/posts/:id" element={<PostDetailPage />} />
              <Route path="/tags/:tag" element={<TagPage />} />
              <Route path="/login" element={<LoginPage />} />

              {/* 需要认证的路由 */}
              <Route path="/mutters" element={<MutterListPage />} />
              <Route path="/mutters/:id" element={<MutterDetailPage />} />
              <Route
                path="/admin"
                element={
                  <AdminRoute>
                    <AdminPage />
                  </AdminRoute>
                }
              />
              <Route
                path="/admin/editor"
                element={
                  <AdminRoute>
                    <EditorPage />
                  </AdminRoute>
                }
              />
              <Route
                path="/admin/editor/:id"
                element={
                  <AdminRoute>
                    <EditorPage />
                  </AdminRoute>
                }
              />
              <Route
                path="/admin/mutter-editor"
                element={
                  <AdminRoute>
                    <MutterEditorPage />
                  </AdminRoute>
                }
              />
              <Route
                path="/admin/mutter-editor/:id"
                element={
                  <AdminRoute>
                    <MutterEditorPage />
                  </AdminRoute>
                }
              />

              {/* 404 - 重定向到首页 */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
