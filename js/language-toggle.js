/**
 * Language Toggle Module
 * Handles UI for language switching
 */

class LanguageToggle {
  constructor(i18nInstance) {
    this.i18n = i18nInstance;
    this.init();
  }

  init() {
    // Wait for i18n to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setupToggle());
    } else {
      this.setupToggle();
    }
  }

  setupToggle() {
    // Create language toggle if it doesn't exist
    let toggleContainer = document.querySelector('.language-toggle');
    
    if (!toggleContainer) {
      // Try to find where to insert it (usually in header)
      const header = document.querySelector('header .header-content');
      if (header) {
        toggleContainer = document.createElement('div');
        toggleContainer.className = 'language-toggle';
        header.appendChild(toggleContainer);
      } else {
        console.warn('Language toggle container not found');
        return;
      }
    }

    // Clear existing content
    toggleContainer.innerHTML = '';

    // Create English button
    const enButton = document.createElement('button');
    enButton.textContent = 'English';
    enButton.setAttribute('data-lang', 'en');
    enButton.setAttribute('aria-label', 'Switch to English');
    enButton.addEventListener('click', () => this.switchLanguage('en'));

    // Create Hindi button
    const hiButton = document.createElement('button');
    hiButton.textContent = 'हिंदी';
    hiButton.setAttribute('data-lang', 'hi');
    hiButton.setAttribute('aria-label', 'Switch to Hindi');
    hiButton.addEventListener('click', () => this.switchLanguage('hi'));

    // Add buttons to container
    toggleContainer.appendChild(enButton);
    toggleContainer.appendChild(hiButton);

    // Update active state
    this.updateActiveState();

    // Listen for language changes
    this.i18n.onLanguageChange(() => {
      this.updateActiveState();
    });
  }

  switchLanguage(lang) {
    this.i18n.setLanguage(lang);
  }

  updateActiveState() {
    const currentLang = this.i18n.getLanguage();
    const buttons = document.querySelectorAll('.language-toggle button');
    
    buttons.forEach(button => {
      const buttonLang = button.getAttribute('data-lang');
      if (buttonLang === currentLang) {
        button.classList.add('active');
        button.setAttribute('aria-pressed', 'true');
      } else {
        button.classList.remove('active');
        button.setAttribute('aria-pressed', 'false');
      }
    });
  }
}

// Initialize language toggle when i18n is ready
function initLanguageToggle() {
  if (typeof i18n !== 'undefined') {
    new LanguageToggle(i18n);
  } else {
    // Retry after a short delay
    setTimeout(initLanguageToggle, 100);
  }
}

// Start initialization
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initLanguageToggle);
} else {
  initLanguageToggle();
}

