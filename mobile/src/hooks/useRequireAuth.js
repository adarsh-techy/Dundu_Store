/**
 * useRequireAuth — call this hook in any screen/handler that needs auth.
 * Returns a `requireAuth(callback)` function that either runs the callback
 * (if logged in) or shows a polished login prompt modal.
 */
import { useCallback } from 'react';
import useAuthStore from '../store/auth.store';
import useLoginPromptStore from '../store/loginPrompt.store';

export default function useRequireAuth() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const showPrompt = useLoginPromptStore((s) => s.show);

  const requireAuth = useCallback(
    (callback, message) => {
      if (isAuthenticated) {
        callback?.();
      } else {
        showPrompt(message);
      }
    },
    [isAuthenticated, showPrompt]
  );

  return { requireAuth, isAuthenticated };
}
