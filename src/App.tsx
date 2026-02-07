import { Routes, Route } from 'react-router-dom';
import { ApplicationProvider } from '@/context/ApplicationContext';
import { AuthProvider } from '@/context/AuthContext';
import { CreditsProvider } from '@/context/CreditsContext';
import { AppLayout } from '@/components/AppLayout';
import { Landing } from '@/components/Landing';
import { VideoGenerator } from '@/components/VideoGenerator';
import { ImageGenerator } from '@/components/ImageGenerator';
import { LoginPage, RegisterPage, ProtectedRoute } from '@/components/auth';
import { ProfilePage } from '@/components/ProfilePage';

function App() {
  return (
    <AuthProvider>
      <CreditsProvider>
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
              <Route path="/profile" element={<ProfilePage />} />
            </Route>
          </Routes>
        </ApplicationProvider>
      </CreditsProvider>
    </AuthProvider>
  );
}

export default App;