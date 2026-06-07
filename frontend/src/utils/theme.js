export function hexToRgb(hex) {
  if (!hex) return null;
  const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
  const fullHex = hex.replace(shorthandRegex, (m, r, g, b) => r + r + g + g + b + b);
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(fullHex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

export function adjustColorBrightness(hex, percent) {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const r = Math.max(0, Math.min(255, rgb.r + percent));
  const g = Math.max(0, Math.min(255, rgb.g + percent));
  const b = Math.max(0, Math.min(255, rgb.b + percent));
  const toHex = (c) => String(c.toString(16)).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function applyTheme(theme) {
  if (!theme) return;

  const primary = theme.primary_color || '#FF6B35';
  const secondary = theme.secondary_color || '#1A0533';
  const bg = theme.background_color || '#0F0F0F';
  const text = theme.text_color || '#FFFFFF';
  const button = theme.button_color || primary;
  const radius = theme.border_radius === 'quadrada' ? '0px' : '16px';
  const font = theme.font_family || 'Inter';

  // Set standard variables
  document.documentElement.style.setProperty('--theme-primary', primary);
  document.documentElement.style.setProperty('--theme-secondary', secondary);
  document.documentElement.style.setProperty('--theme-bg', bg);
  document.documentElement.style.setProperty('--theme-text', text);
  document.documentElement.style.setProperty('--theme-button', button);
  document.documentElement.style.setProperty('--theme-radius', radius);
  document.documentElement.style.setProperty('--theme-font', font);
  document.body.style.fontFamily = font;

  // Set alpha channels for primary color
  const rgb = hexToRgb(primary);
  if (rgb) {
    document.documentElement.style.setProperty('--theme-primary-alpha15', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.15)`);
    document.documentElement.style.setProperty('--theme-primary-alpha20', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.20)`);
    document.documentElement.style.setProperty('--theme-primary-alpha50', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.50)`);
  }

  // Set button hover color (15% darker)
  const hoverColor = adjustColorBrightness(button, -25);
  document.documentElement.style.setProperty('--theme-button-hover', hoverColor);

  // Set meta theme color dynamically for PWA
  const metaThemeColor = document.querySelector('meta[name="theme-color"]');
  if (metaThemeColor) {
    metaThemeColor.setAttribute('content', primary);
  }

  // Set theme mode
  if (theme.theme_mode === 'light') {
    document.documentElement.classList.add('light-mode');
  } else {
    document.documentElement.classList.remove('light-mode');
  }

  // Load Google Font
  if (theme.font_family && theme.font_family !== 'Inter') {
    const linkId = 'dynamic-google-font';
    let link = document.getElementById(linkId);
    if (!link) {
      link = document.createElement('link');
      link.id = linkId;
      link.rel = 'stylesheet';
      document.head.appendChild(link);
    }
    link.href = `https://fonts.googleapis.com/css2?family=${font.replace(/ /g, '+')}:wght@300;400;500;600;700;800;900&display=swap`;
  }
}

export function removeTheme() {
  document.documentElement.style.removeProperty('--theme-primary');
  document.documentElement.style.removeProperty('--theme-secondary');
  document.documentElement.style.removeProperty('--theme-bg');
  document.documentElement.style.removeProperty('--theme-text');
  document.documentElement.style.removeProperty('--theme-button');
  document.documentElement.style.removeProperty('--theme-radius');
  document.documentElement.style.removeProperty('--theme-font');
  document.documentElement.style.removeProperty('--theme-primary-alpha15');
  document.documentElement.style.removeProperty('--theme-primary-alpha20');
  document.documentElement.style.removeProperty('--theme-primary-alpha50');
  document.documentElement.style.removeProperty('--theme-button-hover');
  document.body.style.fontFamily = '';
  document.documentElement.classList.remove('light-mode');

  // Reset meta theme color dynamically for PWA
  const metaThemeColor = document.querySelector('meta[name="theme-color"]');
  if (metaThemeColor) {
    metaThemeColor.setAttribute('content', '#FF6B35');
  }
}
