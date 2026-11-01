import { useEffect } from 'react';
import { BrowserRouter, Link, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { SiteFooter } from './components/SiteFooter';
import { SiteHeader } from './components/SiteHeader';
import { HomePage } from './pages/HomePage';
import { ImpactPage } from './pages/ImpactPage';
import { PrivacyPage } from './pages/PrivacyPage';
import { SystemPage } from './pages/SystemPage';

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [pathname]);

  return null;
}

function Layout() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main id="main" className="flex-1">
        <Outlet />
      </main>
      <SiteFooter />
    </div>
  );
}

function NotFound() {
  return (
    <section className="page-hero">
      <div className="page-hero__inner">
        <div className="page-hero__copy">
          <p className="eyebrow">404</p>
          <h1 className="hero-display">
            That page is <span className="gradient-word">elsewhere.</span>
          </h1>
          <p className="page-hero__subtext">
            The link may be old, or the page may only exist in the production site.
          </p>
          <div className="page-hero__actions">
            <Link to="/" className="btn-primary">
              Back home
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="/impact" element={<ImpactPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/system" element={<SystemPage />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
