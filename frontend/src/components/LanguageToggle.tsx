import { useTranslation } from 'react-i18next'

export default function LanguageToggle() {
  const { i18n } = useTranslation()

  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={() => i18n.changeLanguage('en')}
        className="px-3 py-1 text-xs sm:text-sm rounded-full bg-white/80 hover:bg-white shadow border border-gray-200"
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => i18n.changeLanguage('hi')}
        className="px-3 py-1 text-xs sm:text-sm rounded-full bg-white/80 hover:bg-white shadow border border-gray-200"
      >
        हिन्दी
      </button>
    </div>
  )
}
