import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Languages } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const languages = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'ru', name: 'Русский', flag: '🇷🇺' }
];

interface LanguageSwitcherProps {
  variant?: 'select' | 'button';
  size?: 'sm' | 'default' | 'lg';
}

export const LanguageSwitcher = ({ variant = 'select', size = 'default' }: LanguageSwitcherProps) => {
  const { i18n } = useTranslation();

  const currentLanguage = languages.find(lang => lang.code === i18n.language) || languages[0];

  const handleLanguageChange = (languageCode: string) => {
    i18n.changeLanguage(languageCode);
  };

  if (variant === 'button') {
    return (
      <div className="flex items-center gap-1">
        {languages.map((language) => (
          <Button
            key={language.code}
            variant={currentLanguage.code === language.code ? 'default' : 'ghost'}
            size={size}
            onClick={() => handleLanguageChange(language.code)}
            className="px-2"
          >
            <span className="mr-1">{language.flag}</span>
            <span className="hidden sm:inline">{language.name}</span>
          </Button>
        ))}
      </div>
    );
  }

  return (
    <Select value={currentLanguage.code} onValueChange={handleLanguageChange}>
      <SelectTrigger className={`w-auto ${size === 'sm' ? 'h-8' : 'h-10'}`}>
        <div className="flex items-center gap-2">
          <Languages className="h-4 w-4" />
          <SelectValue>
            <span className="flex items-center gap-1">
              {currentLanguage.flag}
              <span className="hidden sm:inline">{currentLanguage.name}</span>
            </span>
          </SelectValue>
        </div>
      </SelectTrigger>
      <SelectContent>
        {languages.map((language) => (
          <SelectItem key={language.code} value={language.code}>
            <span className="flex items-center gap-2">
              {language.flag}
              {language.name}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};