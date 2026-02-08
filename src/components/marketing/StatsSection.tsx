import { Users, Zap, Target } from 'lucide-react';

const stats = [
  {
    icon: Users,
    value: 'Teams',
    label: 'Built for performance marketing teams',
  },
  {
    icon: Zap,
    value: 'Seconds',
    label: 'Analyze competitor ads in seconds',
  },
  {
    icon: Target,
    value: '10',
    label: 'Track up to 10 competitors per brand',
  },
];

export function StatsSection() {
  return (
    <section className="py-16 px-4 bg-indigo-600">
      <div className="max-w-6xl mx-auto">
        <div className="grid md:grid-cols-3 gap-8">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div key={index} className="text-center">
                <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <div className="text-3xl font-bold text-white mb-2">
                  {stat.value}
                </div>
                <p className="text-indigo-100">
                  {stat.label}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
