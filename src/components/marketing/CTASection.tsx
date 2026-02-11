import Link from 'next/link';

export function CTASection() {
  return (
    <section className="py-20 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center">
          <h2 className="text-3xl font-bold text-slate-900 mb-4">
            Ready to get started?
          </h2>
          <p className="text-lg text-slate-600 mb-8 max-w-xl mx-auto">
            Join agencies and DTC brands using AdMirror to outperform their competition.
          </p>

          <div className="flex items-center justify-center gap-4">
            <Link
              href="/login?signup=true"
              className="px-7 py-3.5 bg-indigo-600 text-white font-medium rounded-full hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
            >
              Sign Up Free
            </Link>
            <Link
              href="/login"
              className="px-7 py-3.5 bg-white text-slate-700 font-medium rounded-full border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-colors"
            >
              Log In
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
