import { useTranslation } from 'react-i18next'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui-tw'
import { Languages } from 'lucide-react'
import { Button } from '@/components/ui-tw'

const languages = [
  { code: 'zh-CN', label: '中文' },
  { code: 'en-US', label: 'English' },
]

export const LanguageSwitcher = () => {
  const { i18n } = useTranslation()

  const handleLanguageChange = async (langCode: string) => {
    await i18n.changeLanguage(langCode)
    localStorage.setItem('language', langCode)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9">
          <Languages className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {languages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => handleLanguageChange(lang.code)}
            className={i18n.language === lang.code ? 'bg-accent' : ''}
          >
            {lang.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
