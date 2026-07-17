// Applies the saved admin theme before first paint so /admin loads in the
// last-used light/dark mode instead of flashing until the toggle mounts.
// Key must match adminThemeStorageKey in components/menu/theme-toggle.tsx.
const themeScript = `try{var t=localStorage.getItem('stone-cafe-admin-theme');var d=document.documentElement.classList;if(t==='dark')d.add('dark');else if(t==='light')d.remove('dark');}catch(e){}`;

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      {children}
    </>
  );
}
