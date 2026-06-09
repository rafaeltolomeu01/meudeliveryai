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
  root.classList.remove('dark');
  document.body?.classList?.remove('dark');
}

function hideAppearanceMenu() {
  const words = ['Aparência', 'Personalização', 'Personalizacao', 'Tema', 'Temas'];
  const nodes = document.querySelectorAll('a, button, [role="button"], li, nav div');
  nodes.forEach((el) => {
    const text = (el.textContent || '').trim();
    const href = (el.getAttribute?.('href') || '').toLowerCase();
    const shouldHide = words.some(w => text === w || text.includes(w)) || href.includes('appearance') || href.includes('aparencia') || href.includes('theme');
    if (!shouldHide) return;
    let target = el;
    for (let i = 0; i < 2; i++) {
      if (target.parentElement && (target.parentElement.tagName === 'LI' || target.parentElement.tagName === 'DIV')) {
        target = target.parentElement;
      }
    }
    target.style.setProperty('display', 'none', 'important');
  });
}

function keepMenuLinkVisible() {
  // Garante que o bloco de link do cardapio nao suma por CSS antigo.
  const candidates = [...document.querySelectorAll('section, div, article')].filter((el) => {
    const t = (el.textContent || '').toLowerCase();
    return t.includes('cardápio digital') || t.includes('cardapio digital') || t.includes('copiar link') || t.includes('visualizar cardápio') || t.includes('visualizar cardapio');
  });
  candidates.forEach((el) => {
    el.style.removeProperty('display');
    el.style.removeProperty('visibility');
    el.style.removeProperty('opacity');
  });
}

function boot() {
  clearThemeStorage();
  setVars();
  hideAppearanceMenu();
  keepMenuLinkVisible();
}

boot();
window.addEventListener('load', boot);
window.addEventListener('focus', boot);

const observer = new MutationObserver(() => boot());
observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style'] });
