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

  const welcomeName = text.match(/^Welcome, ([^.]+)$/);
  if (welcomeName) return `Murakaza neza, ${welcomeName[1]}`;

  const resolvedToast = text.match(/^(SCF-\d{4}-\d+) was resolved\. The citizen can now rate it\.$/);
  if (resolvedToast) return `${resolvedToast[1]} cyakemuwe. Umuturage ashobora gutanga amanota.`;

  const lowRating = text.match(/^You rated (\d)\/5, so (SCF-\d{4}-\d+) was reopened and escalated to (.+)\.$/);
  if (lowRating) return `Watanze amanota ${lowRating[1]}/5, bityo ${lowRating[2]} cyongeye gufunguka kandi cyazamuwe kuri ${translateText(lowRating[3])}.`;

  const thanksClosed = text.match(/^Thank you\. (SCF-\d{4}-\d+) is now closed\.$/);
  if (thanksClosed) return `Murakoze. ${thanksClosed[1]} cyarafunzwe.`;

  const routingSaved = text.match(/^(.+) now goes to the office you chose, answered within (\d+) days\.$/);
  if (routingSaved) return `${translateText(routingSaved[1])} ubu kijya mu biro wahisemo, kigasubizwa mu minsi ${routingSaved[2]}.`;

  const canLogin = text.match(/^(.+) can now log in\.$/);
  if (canLogin) return `${canLogin[1]} ubu ashobora kwinjira.`;

  const accountStatus = text.match(/^(.+) is now (active|suspended)\.$/);
  if (accountStatus) return `${accountStatus[1]} ubu ${accountStatus[2] === 'active' ? 'arakora' : 'yarahagaritswe'}.`;

  const slaEscalations = text.match(/^(\d+) complaint\(s\) passed their due date and were escalated automatically\.$/);
  if (slaEscalations) return `Ibirego ${slaEscalations[1]} byarengeje itariki ntarengwa, bizamuwe byikoreye.`;

  const genericDeleted = text.match(/^(.+) was deleted\.$/);
  if (genericDeleted) return `${translateText(genericDeleted[1])} byasibwe.`;

  // ── Case chat, citizen appeals, and the notifications the office receives ──
  const askForHelp = text.match(/^Ask (.+) for help$/);
  if (askForHelp) return `Saba ubufasha kuri ${translateText(askForHelp[1])}`;

  const appealNote = text.match(/^Your case is sent to (.+) and the administrator is notified\.$/);
  if (appealNote) return `Ikibazo cyawe cyoherezwa kuri ${translateText(appealNote[1])} kandi umuyobozi aramenyeshwa.`;

  const ratingHint = text.match(/^Pick a rating to close this complaint\. 1–2 stars sends it back to (.+) instead\.$/);
  if (ratingHint) return `Hitamo amanota kugira ngo ufunge iki kibazo. Amanota 1–2 acyohereza kuri ${translateText(ratingHint[1])} aho kugifunga.`;

  const assignedToDept = text.match(/^(SCF-\d{4}-\d+) \((.+), (.+)\) was assigned to your department\. Answer it by (.+)\.$/);
  if (assignedToDept) return `${assignedToDept[1]} (${translateText(assignedToDept[2])}, ${translateText(assignedToDept[3])}) cyahawe ishami ryawe. Gisubize bitarenze ${assignedToDept[4]}.`;

  const repliedTo = text.match(/^(.+) replied to (SCF-\d{4}-\d+)\.$/);
  if (repliedTo) return `${repliedTo[1]} yasubije ${repliedTo[2]}.`;

  const sentMessage = text.match(/^(.+) sent a message on (SCF-\d{4}-\d+)\.$/);
  if (sentMessage) return `${sentMessage[1]} yohereje ubutumwa kuri ${sentMessage[2]}.`;

  const reassignedToDept = text.match(/^(SCF-\d{4}-\d+) was reassigned to your department by (.+)\.$/);
  if (reassignedToDept) return `${reassignedToDept[1]} cyoherejwe mu ishami ryawe na ${reassignedToDept[2]}.`;

  const escalatedByStaff = text.match(/^(SCF-\d{4}-\d+) was escalated to (.+) by (.+) and needs urgent follow-up\.$/);
  if (escalatedByStaff) return `${escalatedByStaff[1]} cyazamuwe kuri ${translateText(escalatedByStaff[2])} na ${escalatedByStaff[3]} kandi gikeneye gukurikiranwa byihutirwa.`;

  const askedForHelpOn = text.match(/^(.+) asked for help on (SCF-\d{4}-\d+)\. It was escalated to (.+)\.$/);
  if (askedForHelpOn) return `${askedForHelpOn[1]} yasabye ubufasha kuri ${askedForHelpOn[2]}. Cyazamuwe kuri ${translateText(askedForHelpOn[3])}.`;

  const returnedLowRating = text.match(/^(SCF-\d{4}-\d+) was rated (\d)\/5 by the citizen and returned to (.+) for follow-up\.$/);
  if (returnedLowRating) return `${returnedLowRating[1]} cyahawe amanota ${returnedLowRating[2]}/5 n umuturage kandi cyagaruwe kuri ${translateText(returnedLowRating[3])} gikurikiranwe.`;

  const confirmedResolved = text.match(/^(.+) confirmed (SCF-\d{4}-\d+) is resolved and rated it (\d)\/5\.$/);
  if (confirmedResolved) return `${confirmedResolved[1]} yemeje ko ${confirmedResolved[2]} cyakemutse kandi agiha amanota ${confirmedResolved[3]}/5.`;

  const escalatedAtRequest = text.match(/^(SCF-\d{4}-\d+) was escalated to (.+) at your request\.$/);
  if (escalatedAtRequest) return `${escalatedAtRequest[1]} cyazamuwe kuri ${translateText(escalatedAtRequest[2])} nk uko wabisabye.`;

  const seniorReviewReason = text.match(/^Citizen asked for senior review: (.+)$/);
  if (seniorReviewReason) return `Umuturage yasabye ko ikibazo gisuzumwa n umuyobozi mukuru: ${seniorReviewReason[1]}`;

  const sentMessageAudit = text.match(/^Sent a message on complaint (SCF-\d{4}-\d+)$/);
  if (sentMessageAudit) return `Yohereje ubutumwa ku kibazo ${sentMessageAudit[1]}`;

  const requestedEscalationAudit = text.match(/^Requested escalation of complaint (SCF-\d{4}-\d+)$/);
  if (requestedEscalationAudit) return `Yasabye ko ikibazo ${requestedEscalationAudit[1]} kizamurwa`;

  const unreadFromCitizen = text.match(/^(\d+) new (?:message|messages) from the citizen$/);
  if (unreadFromCitizen) return `Ubutumwa bushya ${unreadFromCitizen[1]} buturutse ku muturage`;

  const unreadCount = text.match(/^(\d+) new (?:message|messages)$/);
  if (unreadCount) return `Ubutumwa bushya ${unreadCount[1]}`;

  const idDigits = text.match(/^(\d+) of (\d+) digits$/);
  if (idDigits) return `Imibare ${idDigits[1]} kuri ${idDigits[2]}`;

  const requiredDetails = text.match(/^These details are required: (.+)\.$/);
  if (requiredDetails) {
    const fields = requiredDetails[1].split(', ').map((field) => translateText(field)).join(', ');
    return `Aya makuru arakenewe: ${fields}.`;
  }

  return null;
};

// Emails, links and tracking numbers are identifiers, not prose. Substring translation
// would turn jean@smartcitizen.rw into jean@smartUmuturage.rw, so never touch them.
const isIdentifier = (text) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)
  || /^https?:\/\//i.test(text)
  || /^SCF-\d{4}-\d+$/.test(text);

export const translateText = (source) => {
  if (i18n.language !== 'rw') return source;
  const text = String(source);
  const inner = text.trim();
  if (!inner || isIdentifier(inner)) return source;

  const exact = i18n.exists(inner) ? i18n.t(inner) : null;
  if (exact) return preserveWhitespace(text, exact);

  const dynamic = translateDynamic(inner);
  if (dynamic) return preserveWhitespace(text, dynamic);

  const termTranslated = translateKnownTerms(inner);
  return preserveWhitespace(text, termTranslated);
};

export default i18n;
