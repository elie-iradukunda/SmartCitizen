import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { rwTranslations } from './translations.js';

const resources = {
  en: { translation: {} },
  rw: { translation: rwTranslations }
};

const savedLanguage = localStorage.getItem('smartCitizenLanguage') || 'en';

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: ['en', 'rw'].includes(savedLanguage) ? savedLanguage : 'en',
    fallbackLng: 'en',
    keySeparator: false,
    nsSeparator: false,
    interpolation: { escapeValue: false }
  });

i18n.on('languageChanged', (language) => {
  localStorage.setItem('smartCitizenLanguage', language);
  document.documentElement.lang = language === 'rw' ? 'rw' : 'en';
});

document.documentElement.lang = i18n.language === 'rw' ? 'rw' : 'en';

const preserveWhitespace = (source, translated) => {
  const match = String(source).match(/^(\s*)(.*?)(\s*)$/s);
  if (!match) return translated;
  return `${match[1]}${translated}${match[3]}`;
};

const translateKnownTerms = (text) => {
  let result = text;
  Object.keys(rwTranslations)
    .sort((a, b) => b.length - a.length)
    .forEach((term) => {
      if (term.length < 4 || !result.includes(term)) return;
      result = result.split(term).join(rwTranslations[term]);
    });
  return result;
};

const translateDynamic = (text) => {
  const welcomeBack = text.match(/^Welcome back, (.+)\.$/);
  if (welcomeBack) return `Murakaza neza, ${welcomeBack[1]}.`;

  const welcomeNew = text.match(/^Welcome, (.+)\. Your citizen account is ready\.$/);
  if (welcomeNew) return `Murakaza neza, ${welcomeNew[1]}. Konti yawe y umuturage iriteguye.`;

  const submittedToast = text.match(/^Complaint submitted\. Tracking number (SCF-\d{4}-\d+)\.$/);
  if (submittedToast) return `Ikibazo cyatanzwe. Inomero yo kugikurikirana ni ${submittedToast[1]}.`;

  const updatedToast = text.match(/^(SCF-\d{4}-\d+) updated to (.+)\.$/);
  if (updatedToast) return `${updatedToast[1]} cyavuguruwe kiba ${translateText(updatedToast[2])}.`;

  const escalatedToast = text.match(/^(SCF-\d{4}-\d+) escalated\.$/);
  if (escalatedToast) return `${escalatedToast[1]} cyazamuwe.`;

  const deletedToast = text.match(/^(SCF-\d{4}-\d+) was deleted\.$/);
  if (deletedToast) return `${deletedToast[1]} cyasibwe.`;

  const routedSummary = text.match(/^Automatically routed to (.+) and assigned to (.+)\.$/);
  if (routedSummary) return `Cyoherejwe kuri ${translateText(routedSummary[1])} kandi gihabwa ${routedSummary[2]}.`;

  const rateResolved = text.match(/^Rate resolved case (SCF-\d{4}-\d+)$/);
  if (rateResolved) return `Tanga amanota ku kibazo cyakemutse ${rateResolved[1]}`;

  const routed = text.match(/^Complaint received and automatically routed to (.+)\.$/);
  if (routed) return `Ikibazo cyakiriwe kandi cyoherejwe kuri ${translateText(routed[1])}.`;

  const submitted = text.match(/^Your complaint (SCF-\d{4}-\d+) was received and assigned to (.+)\.$/);
  if (submitted) return `Ikibazo cyawe ${submitted[1]} cyakiriwe kandi cyoherejwe kuri ${translateText(submitted[2])}.`;

  const reassigned = text.match(/^Your complaint (SCF-\d{4}-\d+) was reassigned to (.+)\.$/);
  if (reassigned) return `Ikibazo cyawe ${reassigned[1]} cyongeye koherezwa kuri ${translateText(reassigned[2])}.`;

  const nowStatus = text.match(/^(SCF-\d{4}-\d+) is now (.+)\.$/);
  if (nowStatus) return `${nowStatus[1]} ubu kiri mu rwego rwa ${translateText(nowStatus[2])}.`;

  const escalated = text.match(/^(SCF-\d{4}-\d+) was escalated to (.+)\.$/);
  if (escalated) return `${escalated[1]} cyazamuwe kuri ${translateText(escalated[2])}.`;

  const closed = text.match(/^Your complaint (SCF-\d{4}-\d+) has been closed\. Thank you for using SCFCMS\.$/);
  if (closed) return `Ikibazo cyawe ${closed[1]} cyasojwe. Murakoze gukoresha SCFCMS.`;

  const updatedTo = text.match(/^Updated complaint (SCF-\d{4}-\d+) to (.+)$/);
  if (updatedTo) return `Yavuguruye ikibazo ${updatedTo[1]} kiba ${translateText(updatedTo[2])}`;

  const submittedAudit = text.match(/^Submitted complaint (SCF-\d{4}-\d+)$/);
  if (submittedAudit) return `Yatanze ikibazo ${submittedAudit[1]}`;

  const ratedAudit = text.match(/^Rated complaint (SCF-\d{4}-\d+) with (\d+) stars$/);
  if (ratedAudit) return `Yahaye ikibazo ${ratedAudit[1]} amanota ${ratedAudit[2]}`;

  return null;
};

export const translateText = (source) => {
  if (i18n.language !== 'rw') return source;
  const text = String(source);
  const inner = text.trim();
  if (!inner) return source;

  const exact = i18n.exists(inner) ? i18n.t(inner) : null;
  if (exact) return preserveWhitespace(text, exact);

  const dynamic = translateDynamic(inner);
  if (dynamic) return preserveWhitespace(text, dynamic);

  const termTranslated = translateKnownTerms(inner);
  return preserveWhitespace(text, termTranslated);
};

export default i18n;
