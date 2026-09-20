import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LANGUAGES, translations } from '../i18n/translations';

const STORAGE_KEY = 'dundu_app_language';

const useLanguageStore = create((set, get) => ({
  language: 'en',
  languages: LANGUAGES,
  initialized: false,

  initLanguage: async () => {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      if (saved && translations[saved]) {
        set({ language: saved, initialized: true });
      } else {
        set({ language: 'en', initialized: true });
      }
    } catch (_) {
      set({ language: 'en', initialized: true });
    }
  },

  setLanguage: async (langCode) => {
    if (!translations[langCode]) return;
    try {
      await AsyncStorage.setItem(STORAGE_KEY, langCode);
      set({ language: langCode });
    } catch (_) {
      set({ language: langCode });
    }
  },

  t: (key, fallback = '') => {
    const lang = get().language || 'en';
    const dict = translations[lang] || translations.en;
    if (dict && dict[key] !== undefined) {
      return dict[key];
    }
    // Fallback to English
    if (translations.en && translations.en[key] !== undefined) {
      return translations.en[key];
    }
    return fallback || key;
  },
}));

export default useLanguageStore;

// Quick helper hook
export function useTranslation() {
  const language = useLanguageStore((s) => s.language);
  const setLanguage = useLanguageStore((s) => s.setLanguage);
  const languages = useLanguageStore((s) => s.languages);
  const t = useLanguageStore((s) => s.t);

  return { language, setLanguage, languages, t };
}
