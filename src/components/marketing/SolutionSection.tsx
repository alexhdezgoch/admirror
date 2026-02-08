import { Filter, Brain, Bookmark } from 'lucide-react';

const features = [
  {
    icon: Filter,
    title: 'Smart Organization',
    description: 'Filter by competitor, format, and how long ads have been running. Find what you need in seconds.',
    color: 'indigo',
  },
  {
    icon: Brain,
    title: 'AI Pattern Detection',
    description: 'Our AI scans competitor ads and surfaces common hooks, visual styles, and copy patterns across your market.',
    color: 'purple',
  },
  {
    icon: Bookmark,
    title: 'Swipe File Builder',
    description: 'Save top ads, generate creative briefs, and build an organized library of inspiration.',
    color: 'emerald',
  },
];

const colorMap = {
  indigo: {
    bg: 'bg-indigo-50',
    icon: 'text-indigo-600',
    border: 'border-indigo-100',
  },
  purple: {
    bg: 'bg-purple-50',
    icon: 'text-purple-600',
    border: 'border-purple-100',
  },
  emerald: {
    bg: 'bg-emerald-50',
    icon: 'text-emerald-600',
    border: 'border-emerald-100',
  },
};

export function SolutionSection() {
  return (
    <section className="py-20 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-slate-900 mb-4">
            Intelligence that drives results
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            AdMirror turns competitive data into creative advantage
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            const colors = colorMap[feature.color as keyof typeof colorMap];
            return (
              <div
                key={index}
                className={`bg-white rounded-2xl border ${colors.border} shadow-sm p-6 hover:shadow-md transition-shadow`}
              >
                <div className={`w-12 h-12 ${colors.bg} rounded-xl flex items-center justify-center mb-4`}>
                  <Icon className={`w-6 h-6 ${colors.icon}`} />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-slate-600">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
