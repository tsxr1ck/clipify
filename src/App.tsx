import { Routes, Route } from 'react-router-dom';
import { ApplicationProvider } from '@/context/ApplicationContext';
import { AuthProvider } from '@/context/AuthContext';
import { AppLayout } from '@/components/AppLayout';
import { Landing } from '@/components/Landing';
import { VideoGenerator } from '@/components/VideoGenerator';
import { ImageGenerator } from '@/components/ImageGenerator';
import { LoginPage, RegisterPage, ProtectedRoute } from '@/components/auth';

function App() {
  return (
    <AuthProvider>
      <ApplicationProvider>
        <Routes>
          {/* Public auth routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Protected app routes */}
          <Route element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }>
            <Route path="/" element={<Landing />} />
            <Route path="/video" element={<VideoGenerator />} />
            <Route path="/image" element={<ImageGenerator />} />
          </Route>
        </Routes>
      </ApplicationProvider>
    </AuthProvider>
  );
}

export default App;