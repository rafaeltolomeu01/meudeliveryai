// MeuDeliveryAI - remove personalizacao de tema e força visual iFood claro
// Importar por ultimo no main.jsx: import './utils/forceIfoodTheme';

const THEME_KEYS = [
  'theme', 'appearance', 'color', 'colors', 'restaurant_theme', 'restaurantTheme',
  'primaryColor', 'secondaryColor', 'accentColor', 'darkMode', 'isDark', 'MeuDeliveryAI-theme'
];

function clearThemeStorage() {
  try {
    const stores = [window.localStorage, window.sessionStorage];
    stores.forEach((store) => {
      if (!store) return;
      Object.keys(store).forEach((key) => {
        const lower = key.toLowerCase();
        if (THEME_KEYS.some((part) => lower.includes(part.toLowerCase()))) {
          store.removeItem(key);
        }
      });
    });
  } catch (_) {}
}

function setVars() {
  try {
    const root = document.documentElement;
    const vars = {
      '--primary': '#ea1d2c',
      '--primary-color': '#ea1d2c',
      '--secondary': '#ffffff',
      '--accent': '#ea1d2c',
      '--background': '#f7f7f7',
      '--foreground': '#1f2937',
      '--card': '#ffffff',
      '--card-foreground': '#1f2937',
      '--muted': '#f3f4f6',
      '--muted-foreground': '#6b7280',
      '--border': '#e5e7eb',
      '--input': '#ffffff',
      '--ring': '#ea1d2c',
      '--sidebar': '#160023',
      '--sidebar-background': '#160023',
      '--sidebar-foreground': '#ffffff'
    };
    Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v, 'important'));
    
    if (root.classList.contains('dark')) root.classList.remove('dark');
    if (document.body && document.body.classList.contains('dark')) document.body.classList.remove('dark');
  } catch (_) {}
}

function boot() {
  clearThemeStorage();
  setVars();
}

// Executa o boot
boot();

if (typeof window !== 'undefined') {
  window.addEventListener('load', boot);
  window.addEventListener('focus', boot);
  
  // Observa apenas a classe do HTML para remover 'dark', evitando loop recursivo de MutationObserver
  const observer = new MutationObserver((mutations) => {
    let shouldFix = false;
    for (const m of mutations) {
      if (m.attributeName === 'class' && document.documentElement.classList.contains('dark')) {
        shouldFix = true;
        break;
      }
    }
    if (shouldFix) {
      observer.disconnect();
      document.documentElement.classList.remove('dark');
      if (document.body) document.body.classList.remove('dark');
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    }
  });
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
}
