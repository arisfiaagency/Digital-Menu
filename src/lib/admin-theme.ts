/** Platform supervisor vs each cafe admin get separate light/dark preferences. */

/** @deprecated Shared key — kept only to migrate into scoped admin keys. */
export const adminThemeStorageKey = "stone-cafe-admin-theme";
export const adminThemeChangeEvent = "stone-cafe-admin-theme-change";

export function adminThemeStorageKeyFor(scope: "platform" | string) {
  return scope === "platform" ? "stone-cafe-admin-theme:platform" : `stone-cafe-admin-theme:client:${scope}`;
}

export function adminThemeChangeEventFor(scope: "platform" | string) {
  return scope === "platform"
    ? "stone-cafe-admin-theme-change:platform"
    : `stone-cafe-admin-theme-change:client:${scope}`;
}

/**
 * Admin theme lives in sessionStorage so each browser tab/window keeps its own
 * light/dark mode. localStorage is only a fallback default for a brand-new tab.
 */
export function adminThemePrepaintScript(scope: "platform" | string) {
  const key = adminThemeStorageKeyFor(scope);
  const legacy = adminThemeStorageKey;
  return `try{var k=${JSON.stringify(key)};var t=sessionStorage.getItem(k);if(t!=='dark'&&t!=='light'){t=localStorage.getItem(k);if(t!=='dark'&&t!=='light'){t=localStorage.getItem(${JSON.stringify(legacy)});}if(t==='dark'||t==='light')sessionStorage.setItem(k,t);}var d=document.documentElement.classList;if(t==='dark')d.add('dark');else if(t==='light')d.remove('dark');}catch(e){}`;
}
