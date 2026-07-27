const colors = {
  red: { backgroundColor: '#3b0a0a', color: '#f87171' },
  green: { backgroundColor: '#0a2e1a', color: '#4ade80' },
  yellow: { backgroundColor: '#2e2000', color: '#facc15' },
  blue: { backgroundColor: '#0a1a3b', color: '#60a5fa' },
  gray: { backgroundColor: '#2a2a2a', color: '#9ca3af' },
};

export default function Badge({ children, color = 'gray' }) {
  return (
    <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={colors[color]}>
      {children}
    </span>
  );
}
