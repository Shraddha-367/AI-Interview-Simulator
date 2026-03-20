import { Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useFirebase } from './hooks/useFirebase';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import Interview from './pages/Interview';
import Results from './pages/Results';
import NotFound from './pages/NotFound';
import History from './pages/History';

function App() {
  const { user, loading, signInWithGoogle } = useFirebase();

  /* ── Loading spinner while auth resolves ── */
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0a0d14]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  /* ── Auth gate: show sign-in if no user ── */
  if (!user) {
    return (
      <>
        <Toaster
          position="top-right"
          toastOptions={{
            style: { background: '#1e1e2e', color: '#e5e7eb', border: '1px solid rgba(255,255,255,0.06)', fontSize: '13px' },
          }}
        />
        <div className="flex h-screen flex-col items-center justify-center gap-8 bg-[#0a0d14] text-white">
          <div className="text-center px-6">
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
              Interview Simulator
            </h1>
            <p className="mt-3 text-gray-400">
              Sign in to start practising with AI-powered mock interviews.
            </p>
          </div>

          <button
            id="google-sign-in"
            type="button"
            onClick={signInWithGoogle}
            className="group inline-flex items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] px-6 py-3 text-sm font-medium text-gray-200 backdrop-blur-sm transition-all duration-300 hover:border-indigo-500/40 hover:bg-white/[0.06] hover:shadow-lg hover:shadow-indigo-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1Z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23Z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84Z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53Z" />
            </svg>
            Sign in with Google
          </button>
        </div>
      </>
    );
  }

  /* ── Authenticated app ── */
  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          style: { background: '#1e1e2e', color: '#e5e7eb', border: '1px solid rgba(255,255,255,0.06)', fontSize: '13px' },
        }}
      />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/interview" element={<Interview />} />
        <Route path="/results" element={<Results />} />
        <Route path="/history" element={<History />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}

export default App;
