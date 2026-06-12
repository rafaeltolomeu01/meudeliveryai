// MeuDeliveryAI - remove personalizacao de tema e força visual iFood e SaaS claro
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
    
    // Adiciona a classe administrativa caso não exista
    if (!root.classList.contains('mda-ifood-admin')) {
      root.classList.add('mda-ifood-admin');
    }
    if (document.body && !document.body.classList.contains('mda-ifood-admin')) {
      document.body.classList.add('mda-ifood-admin');
    }

    const vars = {
      '--primary': '#FF5A1F',
      '--primary-color': '#FF5A1F',
      '--secondary': '#ffffff',
      '--accent': '#FF5A1F',
      '--background': '#F8FAFC',
      '--foreground': '#111827',
      '--card': '#ffffff',
      '--card-foreground': '#111827',
      '--muted': '#F1F5F9',
      '--muted-foreground': '#64748B',
      '--border': '#E5E7EB',
      '--input': '#ffffff',
      '--ring': '#FF5A1F',
      '--sidebar': '#111827',
      '--sidebar-background': '#111827',
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
