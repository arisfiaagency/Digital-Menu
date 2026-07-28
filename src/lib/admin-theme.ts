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

/** Inline script that applies the scoped admin theme before first paint. */
export function adminThemePrepaintScript(scope: "platform" | string) {
  const key = adminThemeStorageKeyFor(scope);
  return `try{var k=${JSON.stringify(key)};var t=localStorage.getItem(k);if(t!=='dark'&&t!=='light'){t=localStorage.getItem(${JSON.stringify(adminThemeStorageKey)});if(t==='dark'||t==='light')localStorage.setItem(k,t);}var d=document.documentElement.classList;if(t==='dark')d.add('dark');else if(t==='light')d.remove('dark');}catch(e){}`;
}
