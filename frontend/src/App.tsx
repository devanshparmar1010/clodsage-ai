import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppShell } from './components/layout/AppShell';
import { LoadingState } from './components/shared/LoadingState';

const LandingPage = lazy(() => import('./pages/LandingPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const RecommendationsPage = lazy(() => import('./pages/RecommendationsPage'));
const ResourcesPage = lazy(() => import('./pages/ResourcesPage'));
const ForecastPage = lazy(() => import('./pages/ForecastPage'));
const ReportsPage = lazy(() => import('./pages/ReportsPage'));
const ChatPage = lazy(() => import('./pages/ChatPage'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function SuspenseFallback() {
  return (
    <div className="p-8">
      <LoadingState />
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Suspense fallback={<SuspenseFallback />}>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route element={<AppShell />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/recommendations" element={<RecommendationsPage />} />
              <Route path="/resources" element={<ResourcesPage />} />
              <Route path="/forecast" element={<ForecastPage />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/chat" element={<ChatPage />} />

              <Route path="/aws/dashboard" element={<DashboardPage />} />
              <Route path="/aws/recommendations" element={<RecommendationsPage />} />
              <Route path="/aws/resources" element={<ResourcesPage />} />
              <Route path="/aws/forecast" element={<ForecastPage />} />
              <Route path="/aws/reports" element={<ReportsPage />} />
              <Route path="/aws/chat" element={<ChatPage />} />
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
