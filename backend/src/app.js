import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './routes/auth.js';
import complaintRoutes from './routes/complaints.js';
import adminRoutes from './routes/admin.js';

dotenv.config();

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDistPath = path.resolve(__dirname, '../../frontend/dist');

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }));
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'same-origin');
  next();
});
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));
app.use('/uploads', express.static(process.env.UPLOAD_DIR || 'uploads', {
  setHeaders: (res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'private, max-age=3600');
  }
}));

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    name: 'Smart Citizen Feedback and Complaint Management System',
    timestamp: new Date().toISOString()
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/admin', adminRoutes);

if (process.env.SERVE_FRONTEND !== 'false' && fs.existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath, {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('index.html')) {
        res.setHeader('Cache-Control', 'no-store');
      } else if (filePath.includes(`${path.sep}assets${path.sep}`)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      }
    }
  }));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) return next();
    res.setHeader('Cache-Control', 'no-store');
    res.sendFile(path.join(frontendDistPath, 'index.html'), (error) => {
      if (error) next(error);
    });
  });
}

app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

app.use((err, req, res, next) => {
  console.error(err);
  const uniqueError = err.name === 'SequelizeUniqueConstraintError';
  const validationError = err.name === 'SequelizeValidationError';
  const uploadError = err.name === 'MulterError' || err.message?.startsWith('Only image, video, audio, or PDF');
  const message = uniqueError
    ? `${err.errors?.[0]?.path || 'Record'} already exists. Use a different value or update the existing record.`
    : err.message || 'Unexpected server error';

  res.status(err.status || (uniqueError ? 409 : validationError || uploadError ? 422 : 500)).json({ message });
});

export default app;
