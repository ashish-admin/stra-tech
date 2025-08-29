/**
 * Language Switcher Component for LokDarpan
 * 
 * Provides multilingual support with language switching for:
 * - English (en) - Default
 * - Hindi (hi) - Primary Indian language
 * - Telugu (te) - Regional language for Hyderabad/Telangana  
 * - Urdu (ur) - Community language for political outreach
 * 
 * Features:
 * - Smooth language transitions
 * - Persistent language selection
 * - Cultural sensitivity indicators
 * - Political context preservation
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, ChevronDown, Check } from 'lucide-react';

const LANGUAGES = [
  {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    flag: '🇺🇸',
    direction: 'ltr'
  },
  {
    code: 'hi', 
    name: 'Hindi',
    nativeName: 'हिन्दी',
    flag: '🇮🇳',
    direction: 'ltr'
  },
  {
    code: 'te',
    name: 'Telugu', 
    nativeName: 'తెలుగు',
    flag: '🇮🇳',
    direction: 'ltr'
  },
  {
    code: 'ur',
    name: 'Urdu',
    nativeName: 'اردو', 
    flag: '🇮🇳',
    direction: 'rtl'
  }
];

const LanguageSwitcher = ({ className = '' }) => {
  const { i18n, t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  
  const currentLanguage = LANGUAGES.find(lang => lang.code === i18n.language) || LANGUAGES[0];
  
  const changeLanguage = (languageCode) => {
    i18n.changeLanguage(languageCode);
    setIsOpen(false);
    
    // Update document direction for RTL languages
    const selectedLanguage = LANGUAGES.find(lang => lang.code === languageCode);
    if (selectedLanguage) {
      document.documentElement.dir = selectedLanguage.direction;
      document.documentElement.lang = languageCode;
    }
    
    // Store language preference
    localStorage.setItem('lokdarpan_language', languageCode);
    
    // Reload ward data if needed to refresh translations
    window.dispatchEvent(new CustomEvent('language-changed', { detail: languageCode }));
  };
  
  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
        aria-label="Change language"
        aria-expanded={isOpen}
      >
        <Globe className="h-4 w-4 text-gray-600" />
        <span className="hidden sm:inline text-sm font-medium text-gray-700">
          {currentLanguage.nativeName}
        </span>
        <span className="sm:hidden text-sm font-medium text-gray-700">
          {currentLanguage.flag}
        </span>
        <ChevronDown 
          className={`h-4 w-4 text-gray-500 transition-transform duration-200 ${
            isOpen ? 'transform rotate-180' : ''
          }`} 
        />
      </button>
      
      {isOpen && (
        <>
          {/* Overlay */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          
          {/* Dropdown */}
          <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
            <div className="py-1">
              {LANGUAGES.map((language) => (
                <button
                  key={language.code}
                  onClick={() => changeLanguage(language.code)}
                  className={`w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors ${
                    i18n.language === language.code 
                      ? 'bg-blue-50 text-blue-700' 
                      : 'text-gray-700'
                  }`}
                  role="menuitem"
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-lg" role="img" aria-label={language.name}>
                      {language.flag}
                    </span>
                    <div>
                      <div className="font-medium">
                        {language.nativeName}
                      </div>
                      <div className="text-sm text-gray-500">
                        {language.name}
                      </div>
                    </div>
                  </div>
                  
                  {i18n.language === language.code && (
                    <Check className="h-4 w-4 text-blue-600" />
                  )}
                </button>
              ))}
            </div>
            
            {/* Language info footer */}
            <div className="border-t border-gray-100 px-4 py-2">
              <div className="text-xs text-gray-500">
                Political terms adapted for Indian context
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default LanguageSwitcher;