'use client';

import Link from 'next/link';

export function HeroSection() {
  const scrollToDemo = () => {
    document.getElementById('demo-form')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="pt-32 pb-20 px-4">
      <div className="max-w-4xl mx-auto text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 rounded-full mb-8">
          <span className="w-2 h-2 bg-indigo-600 rounded-full animate-pulse" />
          <span className="text-sm font-medium text-indigo-700">
            Built for performance marketers
          </span>
        </div>

        {/* Headline */}
        <h1 className="text-5xl md:text-6xl font-bold text-slate-900 mb-6 leading-tight">
          Stop Scrolling Meta Ad Library.
          <br />
          <span className="text-indigo-600">Start Finding Patterns.</span>
        </h1>

        {/* Subheadline */}
        <p className="text-xl text-slate-600 mb-10 max-w-2xl mx-auto leading-relaxed">
          Browse, filter, and analyze competitor ads in one place. AI spots the patterns
          so you can build your swipe file faster.
        </p>

        {/* CTAs */}
        <div className="flex items-center justify-center gap-4">
          <Link
            href="/login?signup=true"
            className="px-7 py-3.5 bg-indigo-600 text-white font-medium rounded-full hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
          >
            Get Started Free
          </Link>
          <button
            onClick={scrollToDemo}
            className="px-7 py-3.5 bg-white text-slate-700 font-medium rounded-full border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-colors"
          >
            Book a Demo
          </button>
        </div>
      </div>
    </section>
  );
}
