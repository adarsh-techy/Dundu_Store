// Result / speed labels shared by the Stock Check list and detail pages.
export const RESULT_BADGE = {
  profit:       { label: 'Profit',        cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  loss:         { label: 'Loss',          cls: 'bg-rose-50 text-rose-700 border-rose-200' },
  break_even:   { label: 'Break-even',    cls: 'bg-slate-100 text-slate-700 border-slate-200' },
  no_sales:     { label: 'No sales',      cls: 'bg-slate-50 text-slate-500 border-slate-200' },
  cost_missing: { label: 'Buy price missing', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
};

export const SPEED_BADGE = {
  fast:   { label: 'Fast',   cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  medium: { label: 'Medium', cls: 'bg-sky-50 text-sky-700 border-sky-200' },
  slow:   { label: 'Slow',   cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  none:   { label: 'No sales', cls: 'bg-slate-50 text-slate-500 border-slate-200' },
};
