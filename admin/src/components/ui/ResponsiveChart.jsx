import { ResponsiveContainer } from 'recharts';

// Recharts' ResponsiveContainer renders once at its default -1×-1 size before it has
// measured the parent, which logs "The width(-1) and height(-1) of chart should be
// greater than 0" on every chart mount. Starting at 1×1 skips that warning; the real
// size replaces it as soon as the container is measured.
const INITIAL = { width: 1, height: 1 };

export default function ResponsiveChart(props) {
  return <ResponsiveContainer initialDimension={INITIAL} {...props} />;
}
