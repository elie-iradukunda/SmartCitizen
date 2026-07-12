import { Languages } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const options = [
  { code: 'en', label: 'English', short: 'EN' },
  { code: 'rw', label: 'Kinyarwanda', short: 'RW' }
];

export const LanguageSwitcher = () => {
  const { i18n, t } = useTranslation();

  const changeLanguage = (code) => {
    i18n.changeLanguage(code);
  };

  return (
    <div className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white p-1 text-slate-600 shadow-sm" aria-label={t('Change language')}>
      <Languages size={15} className="ml-1 text-slate-400" />
      {options.map((option) => (
        <button
          key={option.code}
          type="button"
          onClick={() => changeLanguage(option.code)}
          className={`rounded px-2 py-1 text-xs font-bold transition ${i18n.language === option.code ? 'bg-brand-600 text-white' : 'hover:bg-slate-50'}`}
          title={t(option.label)}
        >
          {option.short}
        </button>
      ))}
    </div>
  );
};
