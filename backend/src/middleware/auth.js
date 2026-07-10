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
