import jwt from 'jsonwebtoken';
import { User } from '../models/index.js';

export const signToken = (user) => jwt.sign(
  { id: user.id, role: user.role, email: user.email },
  process.env.JWT_SECRET || 'smart-citizen-dev-secret',
  { expiresIn: '7d' }
);

export const requireAuth = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  try {
    const token = header.slice(7);
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'smart-citizen-dev-secret');
    User.findByPk(payload.id)
      .then((user) => {
        if (!user) {
          return res.status(401).json({ message: 'User not found' });
        }
        // A token stays valid for 7 days, so checking status only at login would let a
        // suspended account keep working until its token expired. Re-checking here makes the
        // admin's Suspend button take effect on the very next request.
        if (user.status !== 'active') {
          return res.status(401).json({ message: 'This account is suspended or pending. Ask the admin to activate it.' });
        }
        req.user = user;
        return next();
      })
      .catch(next);
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

export const requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ message: 'You do not have access to this resource' });
  }
  next();
};
