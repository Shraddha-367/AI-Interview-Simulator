import { useNavigate } from 'react-router-dom';

function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="flex h-screen flex-col items-center justify-center gap-6 bg-[#0a0d14] text-white">
      <span className="text-7xl font-extrabold tracking-tighter text-indigo-500/30">404</span>
      <div className="text-center">
        <h1 className="text-xl font-bold">Page not found</h1>
        <p className="mt-1 text-sm text-gray-500">
          The page you're looking for doesn't exist or has been moved.
        </p>
      </div>
      <button
        id="not-found-home"
        type="button"
        onClick={() => navigate('/')}
        className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all duration-300 hover:bg-indigo-500 hover:scale-[1.03] active:scale-[0.98]"
      >
        Go Home
      </button>
    </div>
  );
}

export default NotFound;
