import React, { createContext, useContext } from 'react';
import { useLanguage, Language } from '../hooks/useLanguage';
interface LanguageContextType { language: Language; toggleLanguage: () => void; }
const LanguageContext = createContext<LanguageContextType>({ language: 'es', toggleLanguage: () => {} });
export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { language, toggleLanguage } = useLanguage();
  return <LanguageContext.Provider value={{ language, toggleLanguage }}>{children}</LanguageContext.Provider>;
};
export const useLanguageContext = () => useContext(LanguageContext);
