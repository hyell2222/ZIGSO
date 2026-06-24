import { HashRouter, Routes, Route } from 'react-router-dom';
import HomePage from './pages/home';
import LoginPage from './pages/login';
import ActivitiesPage from './pages/activities';
import ActivityNewPage from './pages/activities/new';
import ActivityEditPage from './pages/activities/edit';
import ActivitySandboxPage from './pages/activities/sandbox';
import SessionsPage from './pages/sessions';
import ReportsPage from './pages/reports';
import PlayPage from './pages/play';
import PlaySessionPage from './pages/play/session';
import NotFoundPage from './pages/not-found';
import { QueryProvider } from './providers/query-provider';
import { Toaster } from 'sonner';
import './globals.css';

export default function App() {
  return (
    <QueryProvider>
      <HashRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/activities" element={<ActivitiesPage />} />
          <Route path="/activities/new" element={<ActivityNewPage />} />
          <Route path="/activities/edit" element={<ActivityEditPage />} />
          <Route path="/activities/sandbox" element={<ActivitySandboxPage />} />
          <Route path="/sessions" element={<SessionsPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/play" element={<PlayPage />} />
          <Route path="/play/session" element={<PlaySessionPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </HashRouter>
      <Toaster
        position="top-center"
        richColors
        duration={3000}
        expand
        closeButton={false}
        toastOptions={{
          classNames: {
            toast:
              "!text-xs mx-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-lg",
          },
        }}
      />
    </QueryProvider>
  );
}
