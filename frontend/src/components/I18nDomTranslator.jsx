import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { translateText } from '../i18n/index.js';

const originalText = new WeakMap();
const translatableAttributes = ['placeholder', 'aria-label', 'title', 'alt'];
// Text inside a textarea is the user's own value, so it is never translated. The element
// itself still is, otherwise its placeholder would stay in English.
const ignoredTextParents = new Set(['SCRIPT', 'STYLE', 'TEXTAREA']);
const ignoredElements = new Set(['SCRIPT', 'STYLE']);

const translateTextNode = (node, language) => {
  const value = node.nodeValue || '';
  if (!value.trim()) return;

  const stored = originalText.get(node);
  if (language === 'en') {
    if (stored) {
      if (node.nodeValue !== stored) node.nodeValue = stored;
    } else {
      originalText.set(node, value);
    }
    return;
  }

  const translatedStored = stored ? translateText(stored) : null;
  if (!stored || (value !== stored && value !== translatedStored)) {
    originalText.set(node, value);
  }

  const source = originalText.get(node) || value;
  const next = language === 'rw' ? translateText(source) : source;
  if (node.nodeValue !== next) node.nodeValue = next;
};

const translateAttributes = (element, language) => {
  translatableAttributes.forEach((attribute) => {
    if (!element.hasAttribute(attribute)) return;
    const current = element.getAttribute(attribute);
    if (!current?.trim()) return;

    const dataKey = `i18nOriginal${attribute.replace(/(^|-)([a-z])/g, (_, __, char) => char.toUpperCase())}`;
    const stored = element.dataset[dataKey];
    if (language === 'en') {
      if (stored) {
        if (current !== stored) element.setAttribute(attribute, stored);
      } else {
        element.dataset[dataKey] = current;
      }
      return;
    }

    const translatedStored = stored ? translateText(stored) : null;
    if (!stored || (current !== stored && current !== translatedStored)) {
      element.dataset[dataKey] = current;
    }

    const source = element.dataset[dataKey] || current;
    const next = language === 'rw' ? translateText(source) : source;
    if (current !== next) element.setAttribute(attribute, next);
  });
};

const walkAndTranslate = (root, language) => {
  if (!root) return;
  if (root.nodeType === Node.TEXT_NODE) {
    if (!ignoredTextParents.has(root.parentElement?.tagName)) translateTextNode(root, language);
    return;
  }
  if (root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_NODE) return;

  if (root.nodeType === Node.ELEMENT_NODE) translateAttributes(root, language);

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, {
    acceptNode(node) {
      if (node.nodeType === Node.TEXT_NODE && ignoredTextParents.has(node.parentElement?.tagName)) return NodeFilter.FILTER_REJECT;
      if (node.nodeType === Node.ELEMENT_NODE && ignoredElements.has(node.tagName)) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    }
  });

  let node = walker.nextNode();
  while (node) {
    if (node.nodeType === Node.TEXT_NODE) translateTextNode(node, language);
    if (node.nodeType === Node.ELEMENT_NODE) translateAttributes(node, language);
    node = walker.nextNode();
  }
};

export const I18nDomTranslator = () => {
  const { i18n } = useTranslation();
  const translating = useRef(false);
  const frame = useRef(null);

  useEffect(() => {
    const translate = () => {
      if (!document.body) return;
      translating.current = true;
      walkAndTranslate(document.body, i18n.language);
      translating.current = false;
    };

    translate();
    const observer = new MutationObserver(() => {
      if (translating.current) return;
      if (frame.current) cancelAnimationFrame(frame.current);
      frame.current = requestAnimationFrame(translate);
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: translatableAttributes
    });

    return () => {
      if (frame.current) cancelAnimationFrame(frame.current);
      observer.disconnect();
    };
  }, [i18n.language]);

  return null;
};
