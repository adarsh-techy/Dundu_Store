export default function StatCard({ title, value, icon: Icon, color = 'indigo', sub, badge }) {
  const schemes = {
    indigo: {
      card: 'bg-white border-gray-200/90 shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:border-indigo-200 hover:shadow-indigo-500/5',
      title: 'text-gray-500',
      value: 'text-gray-900',
      sub: 'text-indigo-600 font-semibold',
      iconBox: 'bg-indigo-50 text-indigo-600 border border-indigo-100 shadow-xs',
      badge: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    },
    blue: {
      card: 'bg-white border-gray-200/90 shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:border-sky-200 hover:shadow-sky-500/5',
      title: 'text-gray-500',
      value: 'text-gray-900',
      sub: 'text-sky-600 font-semibold',
      iconBox: 'bg-sky-50 text-sky-600 border border-sky-100 shadow-xs',
      badge: 'bg-sky-100 text-sky-700 border-sky-200',
    },
    amber: {
      card: 'bg-white border-gray-200/90 shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:border-amber-200 hover:shadow-amber-500/5',
      title: 'text-gray-500',
      value: 'text-gray-900',
      sub: 'text-amber-600 font-semibold',
      iconBox: 'bg-amber-50 text-amber-600 border border-amber-100 shadow-xs',
      badge: 'bg-amber-100 text-amber-800 border-amber-200',
    },
    rose: {
      card: 'bg-white border-gray-200/90 shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:border-rose-200 hover:shadow-rose-500/5',
      title: 'text-gray-500',
      value: 'text-gray-900',
      sub: 'text-rose-600 font-semibold',
      iconBox: 'bg-rose-50 text-rose-600 border border-rose-100 shadow-xs',
      badge: 'bg-rose-100 text-rose-700 border-rose-200',
    },
    green: {
      card: 'bg-white border-gray-200/90 shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:border-emerald-200 hover:shadow-emerald-500/5',
      title: 'text-gray-500',
      value: 'text-gray-900',
      sub: 'text-emerald-600 font-semibold',
      iconBox: 'bg-emerald-50 text-emerald-600 border border-emerald-100 shadow-xs',
      badge: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    },
    emerald: {
      card: 'bg-white border-gray-200/90 shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:border-emerald-200 hover:shadow-emerald-500/5',
      title: 'text-gray-500',
      value: 'text-gray-900',
      sub: 'text-emerald-600 font-semibold',
      iconBox: 'bg-emerald-50 text-emerald-600 border border-emerald-100 shadow-xs',
      badge: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    },
    purple: {
      card: 'bg-white border-gray-200/90 shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:border-purple-200 hover:shadow-purple-500/5',
      title: 'text-gray-500',
      value: 'text-gray-900',
      sub: 'text-purple-600 font-semibold',
      iconBox: 'bg-purple-50 text-purple-600 border border-purple-100 shadow-xs',
      badge: 'bg-purple-100 text-purple-700 border-purple-200',
    },
  };

  const s = schemes[color] || schemes.indigo;

  return (
    <div className={`${s.card} rounded-3xl p-5 border transition-all duration-200 hover:-translate-y-0.5 flex flex-col justify-between group`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 group-hover:text-gray-600 transition-colors">
            {title}
          </p>
          {badge && (
            <span className={`inline-block mt-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${s.badge}`}>
              {badge}
            </span>
          )}
        </div>
        {Icon && (
          <div className={`p-2.5 rounded-2xl ${s.iconBox} shrink-0 transition-all duration-200 group-hover:scale-105`}>
            <Icon className="h-4 w-4" />
          </div>
        )}
      </div>

      <div className="mt-3.5">
        <p className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight leading-none">
          {value}
        </p>
        {sub && <p className={`text-[11px] ${s.sub} mt-1.5`}>{sub}</p>}
      </div>
    </div>
  );
}
