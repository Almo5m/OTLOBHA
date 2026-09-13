export default function ThemeScript() {
  const script = `
    try {
      var t = localStorage.getItem('otlobha-theme') || 'light';
      document.documentElement.setAttribute('data-theme', t);
    } catch (e) {}
  `;
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
