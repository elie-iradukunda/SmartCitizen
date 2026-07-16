import { Link } from 'react-router-dom';

export const BrandLogo = ({ compact = false, to = '/' }) => (
  <Link to={to} className="brand">
    <span
      className="logo-mark sky-grad"
      style={compact ? { width: 36, height: 36, fontSize: 13, borderRadius: 10 } : undefined}
      aria-hidden="true"
    >
      SC
    </span>
    <span className="brand-name">Smart Citizen</span>
  </Link>
);
