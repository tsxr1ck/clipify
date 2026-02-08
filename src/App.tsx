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
import { SceneBuilder } from './components/SceneBuilder';
import { GenerationsLibrary } from './components/savedScenesLibrary';
import { GenerationDetailPage } from './components/GenerationDetailPage';
import { SceneDetailPage } from './components/SceneDetailPage';
import { StoryDetailPage } from './components/StoryDetailPage';
import { Toaster } from '@/components/ui/sonner';

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
              <Route path="/scene-builder" element={<SceneBuilder />} />
              <Route path="/library" element={<GenerationsLibrary />} />
              <Route path="/library/generation/:id" element={<GenerationDetailPage />} />
              <Route path="/library/scene/:id" element={<SceneDetailPage />} />
              <Route path="/library/story/:id" element={<StoryDetailPage />} />
              <Route path="/profile" element={<ProfilePage />} />
            </Route>
          </Routes>
          <Toaster />
        </ApplicationProvider>
      </CreditsProvider>
    </AuthProvider>
  );
}

export default App;