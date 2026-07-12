import { Link, NavLink, Outlet } from 'react-router-dom';
import { Search } from 'lucide-react';
import { BrandLogo } from '../components/BrandLogo.jsx';
import { LanguageSwitcher } from '../components/LanguageSwitcher.jsx';
import { publicLinks } from '../data/navigation.js';

export const PublicLayout = () => (
  <div className="min-h-screen bg-white">
    <header className="sticky top-0 z-40 border-b border-slate-100 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-4 py-4 sm:px-6 lg:px-8">
        <BrandLogo />
        <nav className="hidden items-center gap-7 lg:flex">
          {publicLinks.slice(0, 6).map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) => `text-sm font-semibold transition ${isActive ? 'text-brand-600' : 'text-slate-600 hover:text-slate-950'}`}
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <button className="hidden h-9 w-9 place-items-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 sm:grid" aria-label="Search">
            <Search size={17} />
          </button>
          <Link to="/login" className="btn-secondary hidden px-4 py-2 sm:inline-flex">Login</Link>
          <Link to="/register" className="btn-primary px-4 py-2">Sign Up</Link>
        </div>
      </div>
    </header>
    <main>
      <Outlet />
    </main>
    <footer className="border-t border-slate-200 bg-slate-950 text-white">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1.3fr_1fr_1fr] lg:px-8">
        <div>
          <BrandLogo dark />
          <p className="mt-4 max-w-md text-sm leading-6 text-slate-300">
            A simple academic prototype for citizen complaint submission, automatic routing, staff response, escalation, reporting, and satisfaction rating.
          </p>
        </div>
        <div>
          <h3 className="text-sm font-bold">Platform</h3>
          <div className="mt-3 grid gap-2 text-sm text-slate-300">
            <Link to="/login">Login</Link>
            <Link to="/register">Citizen Registration</Link>
            <Link to="/contact">Contact</Link>
          </div>
        </div>
        <div>
          <h3 className="text-sm font-bold">Dashboards</h3>
          <div className="mt-3 grid gap-2 text-sm text-slate-300">
            <Link to="/app/dashboard">Citizen</Link>
            <Link to="/admin/dashboard">Admin</Link>
            <Link to="/staff/dashboard">Administrative Staff</Link>
          </div>
        </div>
      </div>
    </footer>
  </div>
);
