import { Link } from 'react-router-dom';
import { Icon } from './Icon';

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <div className="max-w-sm">
          <p className="site-footer__brand">cynbit</p>
          <p className="mt-3 text-sm leading-relaxed text-on-surface-variant">
            A shared hero system for Cynbit&apos;s marketing pages. This is an
            independent interview prototype, not the production website.
          </p>
        </div>

        <div>
          <p className="site-footer__label">Pages</p>
          <ul className="site-footer__list">
            <li><Link to="/">Home</Link></li>
            <li><Link to="/impact">Impact</Link></li>
            <li><Link to="/privacy">Privacy</Link></li>
            <li><Link to="/system">Component demo</Link></li>
          </ul>
        </div>

        <div>
          <p className="site-footer__label">Reference</p>
          <ul className="site-footer__list">
            <li>
              <a href="https://www.cynbit.in" target="_blank" rel="noreferrer">
                Live site <Icon name="arrow_forward" className="inline h-3 w-3" />
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="site-footer__legal">
        <span>© {new Date().getFullYear()} Prototype by Udit Pandey</span>
        <span>Built with React, Vite and Tailwind CSS. No animation library.</span>
      </div>
    </footer>
  );
}
