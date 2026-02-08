'use client';

import { Check, Building2 } from 'lucide-react';
import Link from 'next/link';

const features = [
  'Track up to 10 competitors per brand',
  'AI pattern detection across all ads',
  'Trend analysis & hook breakdowns',
  'Creative brief generation',
  'Unlimited ad syncs',
  'Cancel anytime',
];

export function PricingSection() {
  return (
    <section className="py-20 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-slate-900 mb-4">
            Simple, transparent pricing
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Pay per brand. Perfect for agencies managing multiple clients.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-8 md:p-10">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-8">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-indigo-600" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">Per Brand</h3>
                </div>
                <p className="text-slate-600">
                  Full competitive intelligence for one brand
                </p>
              </div>
              <div className="text-left md:text-right">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-slate-900">$500</span>
                  <span className="text-slate-500">/month</span>
                </div>
                <p className="text-sm text-slate-500">per brand, billed monthly</p>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-3 mb-8">
              {features.map((feature, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Check className="w-3 h-3 text-green-600" />
                  </div>
                  <span className="text-slate-700">{feature}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href="/login?signup=true"
                className="flex-1 px-6 py-3.5 bg-indigo-600 text-white font-medium rounded-xl text-center hover:bg-indigo-700 transition-colors"
              >
                Start Free Trial
              </Link>
              <button
                onClick={() => document.getElementById('demo-form')?.scrollIntoView({ behavior: 'smooth' })}
                className="flex-1 px-6 py-3.5 bg-slate-100 text-slate-700 font-medium rounded-xl text-center hover:bg-slate-200 transition-colors"
              >
                Book a Demo
              </button>
            </div>
          </div>

          {/* Agency callout */}
          <div className="bg-slate-50 border-t border-slate-200 px-8 md:px-10 py-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <p className="font-semibold text-slate-900">Managing multiple brands?</p>
                <p className="text-sm text-slate-600">
                  Add as many brands as you need. Each brand gets its own competitor tracking.
                </p>
              </div>
              <div className="text-left sm:text-right">
                <p className="text-sm text-slate-500">Example: 5 brands</p>
                <p className="font-semibold text-slate-900">$2,500/month</p>
              </div>
            </div>
          </div>
        </div>

        {/* Free tier note */}
        <p className="text-center text-slate-500 text-sm mt-6">
          Start with 1 free brand (1 competitor). Add more brands or competitors when you need them.
        </p>
      </div>
    </section>
  );
}
