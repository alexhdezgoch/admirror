'use client';

import { Check, Building2, Users } from 'lucide-react';
import Link from 'next/link';

const features = [
  'Unlimited competitors per brand',
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
            Simple, usage-based pricing
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Pay only for what you use. Add brands and competitors as you grow.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-8 md:p-10">
            <div className="grid md:grid-cols-2 gap-8 mb-8">
              {/* Brand pricing */}
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-slate-900">$50</span>
                    <span className="text-slate-500">/month</span>
                  </div>
                  <p className="text-slate-600">per brand</p>
                </div>
              </div>

              {/* Competitor pricing */}
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Users className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-slate-900">$30</span>
                    <span className="text-slate-500">/month</span>
                  </div>
                  <p className="text-slate-600">per competitor</p>
                </div>
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
                Get Started
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
                  Add as many brands and competitors as you need. One subscription, usage-based billing.
                </p>
              </div>
              <div className="text-left sm:text-right">
                <p className="text-sm text-slate-500">Example: 3 brands, 5 competitors each</p>
                <p className="font-semibold text-slate-900">$600/month</p>
              </div>
            </div>
          </div>
        </div>

        <p className="text-center text-slate-500 text-sm mt-6">
          Billed monthly. No contracts, cancel anytime.
        </p>
      </div>
    </section>
  );
}
