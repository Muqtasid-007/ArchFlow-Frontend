import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Compass } from 'lucide-react';
import { Button } from '../components/ui/index.jsx';

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="grid min-h-screen place-items-center px-6">
      <div className="max-w-sm text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-line bg-white/[0.03]">
          <Compass className="h-6 w-6 text-cyan-300" />
        </span>
        <h1 className="mt-5 text-2xl font-semibold text-white">Page not found</h1>
        <p className="mt-2 text-sm text-slate-400">
          The board you were looking for may have been deleted, or the link is incorrect.
        </p>
        <Button size="lg" className="mt-6" onClick={() => navigate('/dashboard')}>
          <ArrowLeft className="h-4 w-4" /> Back to dashboard
        </Button>
      </div>
    </div>
  );
}
