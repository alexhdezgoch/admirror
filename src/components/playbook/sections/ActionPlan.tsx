'use client';

import { ActionPlan as ActionPlanType } from '@/types/playbook';
import { ConfidenceBadge } from '../ConfidenceBadge';
import { Calendar, Beaker, Target, ArrowRight, Zap, Eye } from 'lucide-react';

interface Props {
  data: ActionPlanType;
}

const testTypeStyles = {
  hook: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Hook Test' },
  format: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Format Test' },
  angle: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Angle Test' },
  creative: { bg: 'bg-green-100', text: 'text-green-700', label: 'Creative Test' },
};

export function ActionPlan({ data }: Props) {
  if (!data) return null;

  return (
    <section className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 rounded-2xl p-6 border border-indigo-100">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
          <Calendar className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900">Action Plan</h2>
          <p className="text-sm text-slate-500">Prioritized timeline for implementation</p>
        </div>
      </div>

      <div className="space-y-4">
        {/* This Week - Primary Action */}
        <div className="bg-white rounded-xl p-5 border-2 border-indigo-200 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-indigo-600" />
              <span className="text-sm font-semibold text-indigo-600 uppercase tracking-wide">
                This Week
              </span>
            </div>
            <ConfidenceBadge level={data.thisWeek.confidence} size="sm" />
          </div>

          <h3 className="text-lg font-semibold text-slate-900 mb-2">
            {data.thisWeek.action}
          </h3>

          <div className="flex items-start gap-2 text-sm text-slate-600 mb-2">
            <ArrowRight className="w-4 h-4 text-indigo-500 mt-0.5 shrink-0" />
            <span>{data.thisWeek.rationale}</span>
          </div>

          {data.thisWeek.confidenceReason && (
            <p className="text-xs text-slate-500 italic mt-2 pl-6">
              {data.thisWeek.confidenceReason}
            </p>
          )}

          {/* Budget & Kill Criteria */}
          {data.thisWeek.budget && (
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg text-xs font-medium text-green-800">
                💰 {data.thisWeek.budget}
              </span>
              {data.thisWeek.killCriteria && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 border border-red-200 rounded-lg text-xs font-medium text-red-800">
                  🛑 {data.thisWeek.killCriteria}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Next 2 Weeks - Tests */}
        {data.nextTwoWeeks && data.nextTwoWeeks.length > 0 && (
          <div className="bg-white/80 rounded-xl p-5 border border-slate-200">
            <div className="flex items-center gap-2 mb-4">
              <Beaker className="w-5 h-5 text-slate-500" />
              <span className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
                Next 2 Weeks
              </span>
            </div>

            <div className="space-y-3">
              {data.nextTwoWeeks.map((item, index) => {
                const testStyle = testTypeStyles[item.testType] || testTypeStyles.creative;
                return (
                  <div
                    key={index}
                    className="flex items-start justify-between gap-3 p-3 bg-slate-50 rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${testStyle.bg} ${testStyle.text}`}>
                          {testStyle.label}
                        </span>
                      </div>
                      <p className="text-sm text-slate-700">{item.action}</p>
                      {item.budget && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 border border-green-200 rounded text-xs text-green-700">
                            💰 {item.budget}
                          </span>
                          {item.killCriteria && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                              🛑 {item.killCriteria}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <ConfidenceBadge level={item.confidence} size="sm" />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* This Month - Strategic */}
        {data.thisMonth && data.thisMonth.length > 0 && (
          <div className="bg-white/60 rounded-xl p-5 border border-slate-200">
            <div className="flex items-center gap-2 mb-4">
              <Target className="w-5 h-5 text-slate-500" />
              <span className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
                This Month
              </span>
            </div>

            <div className="space-y-3">
              {data.thisMonth.map((item, index) => (
                <div
                  key={index}
                  className="flex items-start justify-between gap-3 p-3 bg-slate-50 rounded-lg"
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900 mb-1">
                      {item.action}
                    </p>
                    <p className="text-xs text-slate-500">
                      Goal: {item.strategicGoal}
                    </p>
                  </div>
                  <ConfidenceBadge level={item.confidence} size="sm" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Monitor & Test Later */}
        {data.monitorAndTestLater && data.monitorAndTestLater.length > 0 && (
          <div className="bg-amber-50/80 rounded-xl p-5 border border-amber-200">
            <div className="flex items-center gap-2 mb-4">
              <Eye className="w-5 h-5 text-amber-600" />
              <span className="text-sm font-semibold text-amber-700 uppercase tracking-wide">
                Monitor & Test Later
              </span>
              <span className="text-xs text-amber-500">High score but not yet proven</span>
            </div>
            {data.monitorAndTestLater.map((item, index) => (
              <div key={index} className="p-3 bg-white rounded-lg mb-2 border border-amber-100">
                <p className="text-sm text-slate-700">{item.action}</p>
                <p className="text-xs text-slate-500 mt-1">{item.rationale}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
