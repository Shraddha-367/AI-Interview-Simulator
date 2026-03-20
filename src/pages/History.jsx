import HistoryDashboard from '../components/HistoryDashboard';

function History() {
  return (
    <div className="relative min-h-screen bg-[#0a0d14] text-white overflow-x-hidden">
      {/* Background glow */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 flex justify-center">
        <div className="blob absolute top-24 h-[340px] w-[340px] rounded-full bg-indigo-500/10 blur-[120px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-3xl px-6 py-16">
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Interview History
          </h1>
          <p className="mt-2 text-gray-400">
            Track your progress across past practice sessions.
          </p>
        </div>

        <HistoryDashboard />
      </div>
    </div>
  );
}

export default History;
