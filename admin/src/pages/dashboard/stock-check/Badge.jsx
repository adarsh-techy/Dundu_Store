export default function Badge({ map, value }) {
  const b = map[value] || map.none || map.no_sales;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold border whitespace-nowrap ${b.cls}`}>
      {b.label}
    </span>
  );
}
