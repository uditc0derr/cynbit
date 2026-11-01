import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Icon } from './Icon';

const NAV = [
  { to: '/', label: 'Home' },
  { to: '/impact', label: 'Impact' },
  { to: '/privacy', label: 'Privacy' },
];

function OrbitMark() {
  return (
    <svg viewBox="0 0 32 32" className="h-8 w-8" aria-hidden="true" focusable="false">
      <circle cx="16" cy="16" r="13.5" fill="none" stroke="currentColor" strokeOpacity="0.28" />
      <ellipse
        cx="16"
        cy="16"
        rx="13.5"
        ry="6"
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.55"
        transform="rotate(-28 16 16)"
      />
      <circle cx="16" cy="16" r="4.25" fill="currentColor" />
      <circle cx="27" cy="9.5" r="2" fill="currentColor" />
    </svg>
  );
}

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  // Close the mobile menu after navigation.
  useEffect(() => setOpen(false), [location.pathname]);

  return (
    <header className="site-header">
      <a href="#main" className="skip-link">
        Skip to content
      </a>

      <div className="site-header__inner">
        <Link to="/" className="brand" aria-label="Cynbit prototype home">
          <span className="brand__mark">
            <OrbitMark />
          </span>
          <span className="brand__text">
            <span className="brand__name">cynbit</span>
            <span className="brand__sub">technologies</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => `nav-link ${isActive ? 'nav-link--active' : ''}`}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <a
            href="https://www.cynbit.in/contact"
            target="_blank"
            rel="noreferrer"
            className="btn-primary hidden !px-6 !py-3 !text-sm sm:inline-flex"
          >
            Talk to Cynbit
            <Icon name="arrow_forward" className="h-4 w-4" />
          </a>

          <button
            type="button"
            className="menu-button md:hidden"
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? 'Close menu' : 'Open menu'}
            onClick={() => setOpen((value) => !value)}
          >
            <Icon name={open ? 'close' : 'menu'} className="h-5 w-5" />
          </button>
        </div>
      </div>

      {open && (
        <div id="mobile-menu" className="mobile-menu md:hidden">
          <nav aria-label="Mobile">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) => `mobile-menu__link ${isActive ? 'is-active' : ''}`}
              >
                {item.label}
                <Icon name="arrow_forward" className="h-4 w-4" />
              </NavLink>
            ))}
          </nav>
          <a
            href="https://www.cynbit.in/contact"
            target="_blank"
            rel="noreferrer"
            className="btn-primary mt-4 w-full justify-center !text-sm"
          >
            Talk to Cynbit
            <Icon name="arrow_forward" className="h-4 w-4" />
          </a>
        </div>
      )}
    </header>
  );
}
