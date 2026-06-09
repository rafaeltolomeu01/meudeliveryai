// Tema fixo estilo iFood.
// A personalização de cores foi desativada para não sobrescrever o visual claro.
export function hexToRgb(hex) {
  if (!hex) return null;
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.replace(/^#?([a-f\d])([a-f\d])([a-f\d])$/i, (m,r,g,b)=>r+r+g+g+b+b));
  return result ? { r: parseInt(result[1],16), g: parseInt(result[2],16), b: parseInt(result[3],16) } : null;
}

export function adjustColorBrightness(hex) { return hex; }

export function applyTheme() {
  const root = document.documentElement;
  root.classList.remove('dark');
  const vars = {
    '--theme-primary': '#ea1d2c',
    '--theme-secondary': '#ffffff',
    '--theme-bg': '#f7f7f7',
    '--theme-text': '#1f2937',
    '--theme-button': '#ea1d2c',
    '--theme-button-hover': '#c91623',
    '--theme-radius': '16px',
    '--theme-font': 'Inter',
    '--theme-primary-alpha15': 'rgba(234,29,44,.15)',
    '--theme-primary-alpha20': 'rgba(234,29,44,.20)',
    '--theme-primary-alpha50': 'rgba(234,29,44,.50)'
  };
  Object.entries(vars).forEach(([k,v]) => root.style.setProperty(k, v));
  document.body.style.fontFamily = 'Inter, system-ui, sans-serif';
}

export function removeTheme() {
  applyTheme();
}
