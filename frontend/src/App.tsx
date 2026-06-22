import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Login } from './pages/Login';
import { NewEmployee } from './pages/NewEmployee';
import { EmployeeDetails } from './pages/EmployeeDetails';
import { WorkflowHistory } from './pages/WorkflowHistory';
import { RetryCenter } from './pages/RetryCenter';
import { FailureMonitoring } from './pages/FailureMonitoring';
import { SystemHealth } from './pages/SystemHealth';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 5, // 5 seconds
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <div className="dark min-h-screen">
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/" element={<Layout><Dashboard /></Layout>} />
              <Route path="/new-employee" element={<Layout><NewEmployee /></Layout>} />
              <Route path="/details/:id" element={<Layout><EmployeeDetails /></Layout>} />
              <Route path="/history" element={<Layout><WorkflowHistory /></Layout>} />
              <Route path="/retry-center" element={<Layout><RetryCenter /></Layout>} />
              <Route path="/failures" element={<Layout><FailureMonitoring /></Layout>} />
              <Route path="/health" element={<Layout><SystemHealth /></Layout>} />
            </Routes>
        </div>
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: 'rgba(17, 24, 39, 0.9)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              color: '#f1f5f9',
              fontSize: '13px',
              fontWeight: '500',
            },
          }}
          richColors
          closeButton
        />
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
