
'use client';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Globe } from 'lucide-react';

export function LanguageToggle() {
  const { language, setLanguage, t } = useLanguage();

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'sw' : 'en');
  };

  const ariaLabel = language === 'en' ? t('languageToggle.switchToSwahili') : t('languageToggle.switchToEnglish');

  return (
    <Button variant="ghost" size="icon" onClick={toggleLanguage} aria-label={ariaLabel} title={ariaLabel}>
      <Globe className="h-5 w-5" />
      <span className="ml-1 text-xs uppercase">{language === 'en' ? 'SW' : 'EN'}</span>
    </Button>
  );
}

