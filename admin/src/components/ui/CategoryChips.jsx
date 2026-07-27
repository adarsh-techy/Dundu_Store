import { useQuery } from '@tanstack/react-query';
import { categoryApi } from '../../api';

const chip = (active) =>
  `px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
    active
      ? 'bg-indigo-600 text-white border-indigo-600'
      : 'bg-white text-gray-500 border-gray-200 hover:border-indigo-300 hover:text-indigo-600'
  }`;

/* valueField: 'slug' for server-side filtering, 'name' for client-side */
export default function CategoryChips({ value, onChange, valueField = 'slug' }) {
  const { data } = useQuery({ queryKey: ['admin-categories'], queryFn: categoryApi.list });
  const categories = data?.data?.categories || [];

  return (
    <div className="flex gap-2 flex-wrap">
      <button onClick={() => onChange('')} className={chip(!value)}>All</button>
      {categories.map((c) => {
        const val = c[valueField];
        return (
          <button key={c.id} onClick={() => onChange(value === val ? '' : val)} className={chip(value === val)}>
            {c.name}
          </button>
        );
      })}
    </div>
  );
}
