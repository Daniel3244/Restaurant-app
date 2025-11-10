import '../App.css';
import { useLocale } from '../context/LocaleContext';

function LanguageSwitcher() {
  const { language, setLanguage } = useLocale();

  return (
    <div className="language-switcher" aria-label="Language selector">
      <button
        type="button"
        onClick={() => setLanguage('pl')}
        className={language === 'pl' ? 'active' : ''}
        aria-pressed={language === 'pl'}
      >
        <span role="img" aria-label="Polska flaga">🇵🇱</span>
        <span>PL</span>
      </button>
      <button
        type="button"
        onClick={() => setLanguage('en')}
        className={language === 'en' ? 'active' : ''}
        aria-pressed={language === 'en'}
      >
        <span role="img" aria-label="United Kingdom flag">🇬🇧</span>
        <span>EN</span>
      </button>
    </div>
  );
}

export default LanguageSwitcher;
