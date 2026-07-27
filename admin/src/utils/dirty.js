// True if a form value differs from its saved counterpart. Numeric-looking
// values are compared numerically (so "050" === "50", true === 1); everything
// else is compared as a trimmed, case-insensitive string (so "#E91E8C" === "#e91e8c").
function valueChanged(formVal, savedVal) {
  const fn = Number(formVal);
  const sn = Number(savedVal);
  const bothNumeric =
    formVal !== '' && savedVal !== '' && savedVal !== undefined && savedVal !== null &&
    !Number.isNaN(fn) && !Number.isNaN(sn);
  if (bothNumeric) return fn !== sn;
  return String(formVal ?? '').trim().toLowerCase() !== String(savedVal ?? '').trim().toLowerCase();
}

// True if any [formVal, savedVal] pair differs. Used to decide whether a
// "Save" button should render — only show it once something has actually
// changed from what's persisted.
export function anyChanged(...pairs) {
  return pairs.some(([formVal, savedVal]) => valueChanged(formVal, savedVal));
}
