import { useTranslation as useAppTranslation } from "../../src/i18n";
import type { TranslationFn } from "../../src/i18n";

// These labels belong only to the archived list. Other labels still use the app dictionary.
const labels = {
  en: {
    aria_prev_color: "Previous color candidate (Level {0} {1})",
    aria_next_color: "Next color candidate (Level {0} {1})",
  },
  ja: {
    aria_prev_color: "前の色候補 (Level {0} {1})",
    aria_next_color: "次の色候補 (Level {0} {1})",
  },
};

export function useTranslation() {
  const app = useAppTranslation();
  const own = labels[app.lang];
  const t: TranslationFn = (key, ...params) => {
    if (!Object.prototype.hasOwnProperty.call(own, key)) return app.t(key, ...params);
    let text: string = own[key as keyof typeof own];
    params.forEach((value, index) => {
      text = text.replace(`{${index}}`, String(value));
    });
    return text;
  };
  return { ...app, t };
}
