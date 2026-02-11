import { Layers, Clock, FolderOpen } from 'lucide-react';

const problems = [
  {
    icon: Layers,
    title: 'Meta Ad Library is a mess',
    description: 'Thousands of ads, no filters, no organization. Finding patterns takes hours of manual scrolling.',
  },
  {
    icon: Clock,
    title: "No way to track what's running long",
    description: "You see ads once and lose them. No easy way to spot which creatives competitors keep running.",
  },
  {
    icon: FolderOpen,
    title: 'Creative research is scattered',
    description: 'Screenshots in folders, notes in docs, insights lost. Your swipe file is a mess.',
  },
];

export function ProblemSection() {
  return (
    <section className="py-20 px-4 bg-slate-100">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-slate-900 mb-4">
            Sound familiar?
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Every DTC brand and agency faces these challenges when scaling Meta ads
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {problems.map((problem, index) => {
            const Icon = problem.icon;
            return (
              <div
                key={index}
                className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6"
              >
                <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center mb-4">
                  <Icon className="w-6 h-6 text-red-500" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  {problem.title}
                </h3>
                <p className="text-slate-600">
                  {problem.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
