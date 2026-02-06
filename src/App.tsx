import { Routes, Route } from 'react-router-dom';
import { ApplicationProvider } from '@/context/ApplicationContext';
import { AppLayout } from '@/components/AppLayout';
import { Landing } from '@/components/Landing';
import { VideoGenerator } from '@/components/VideoGenerator';
import { ImageGenerator } from '@/components/ImageGenerator';

function App() {
  return (
    <ApplicationProvider>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Landing />} />
          <Route path="/video" element={<VideoGenerator />} />
          <Route path="/image" element={<ImageGenerator />} />
        </Route>
      </Routes>
    </ApplicationProvider>
  );
}

export default App;