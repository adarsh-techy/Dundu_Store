import { useEffect } from 'react';

const BRAND = 'Dundu';

/** Sets the browser tab title for the current page. */
export default function useDocumentTitle(title) {
  useEffect(() => {
    const prev = document.title;
    document.title = title ? `${title} · ${BRAND}` : `${BRAND} — Fashion for Every Chapter`;
    return () => { document.title = prev; };
  }, [title]);
}
