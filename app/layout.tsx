import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LIMIT SPORTSWEAR",
  description: "Quản lý bán hàng, tồn kho và đối soát cho LIMIT SPORTSWEAR.",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
const chunkRecovery = `(()=>{const recover=e=>{const message=String(e?.reason?.message||e?.message||e?.reason||"");if(!/dynamically imported module|module script|ChunkLoadError/i.test(message))return;const key="limit-asset-recovery";const last=Number(sessionStorage.getItem(key)||0);if(Date.now()-last<60000)return;sessionStorage.setItem(key,String(Date.now()));const url=new URL(location.href);url.searchParams.set("refresh",String(Date.now()));location.replace(url.href)};addEventListener("error",recover,true);addEventListener("unhandledrejection",recover)} )();`;
const removeNetlifyBadge = `(()=>{const selectors="#nl-badge-frame,#netlify-drawer,[data-netlify-badge],iframe[title*='Netlify'],iframe[aria-label*='Netlify']";const remove=()=>document.querySelectorAll(selectors).forEach(node=>node.remove());new MutationObserver(remove).observe(document.documentElement,{childList:true,subtree:true});addEventListener("DOMContentLoaded",remove);remove()})();`;
  return <html lang="vi"><body className="antialiased"><script dangerouslySetInnerHTML={{ __html: chunkRecovery }} /><script dangerouslySetInnerHTML={{ __html: removeNetlifyBadge }} />{children}</body></html>;
}
