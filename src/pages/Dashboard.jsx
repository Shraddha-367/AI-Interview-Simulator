import useInterviewStore from '../store/useInterviewStore';
import ResumeUploader from '../components/ResumeUploader';
import PersonaSelector from '../components/PersonaSelector';

function Dashboard() {
  const resumeData = useInterviewStore((s) => s.resumeData);

  return (
    <div className="relative min-h-screen bg-[#0a0d14] text-white overflow-hidden">
      {/* Background glow */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 flex justify-center">
        <div className="blob absolute top-24 h-[340px] w-[340px] rounded-full bg-indigo-500/10 blur-[120px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-3xl px-6 py-16">
        {/* Header */}
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            {resumeData ? 'Choose Your Interviewer' : 'Upload Your Resume'}
          </h1>
          <p className="mt-2 text-gray-400">
            {resumeData
              ? 'Pick a persona and difficulty level to begin your practice session.'
              : "We'll extract your skills and tailor interview questions just for you."}
          </p>
        </div>

        {/* Step 1 → Step 2 flow */}
        {resumeData ? <PersonaSelector /> : <ResumeUploader />}
      </div>
    </div>
  );
}

export default Dashboard;
