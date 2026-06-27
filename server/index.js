require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const express = require('express');
const path = require('path');
const rateLimit = require('express-rate-limit');
const { connectDB } = require('./db');
const { requestPasscode, verifyPasscode } = require('./routes/auth');
const { getAccount, updateAccount, requestEmailChange, verifyEmailChange } = require('./routes/account');
const requireAuth = require('./middleware/requireAuth');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const LABS_HOSTS = ['amblyopialabs.com', 'www.amblyopialabs.com'];

const app = express();
app.set('trust proxy', 1);
app.use(express.json());

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again in 15 minutes.' },
});

app.post('/api/auth/request', authLimiter, requestPasscode);
app.post('/api/auth/verify', authLimiter, verifyPasscode);
app.get('/api/account', requireAuth, getAccount);
app.patch('/api/account', requireAuth, updateAccount);
app.post('/api/account/email/request', authLimiter, requireAuth, requestEmailChange);
app.post('/api/account/email/verify', authLimiter, requireAuth, verifyEmailChange);

const GAMES_HOSTS = ['amblyopia.games', 'www.amblyopia.games'];

app.use((req, res, next) => {
  const host = (req.headers.host || '').split(':')[0];
  if (GAMES_HOSTS.includes(host) && /^\/labs(\/|$)/.test(req.path)) {
    const rest = req.path.replace(/^\/labs/, '') || '/';
    return res.redirect(302, `https://www.amblyopialabs.com${rest}`);
  }
  if (LABS_HOSTS.includes(host) && /^\/games(\/|$)/.test(req.path)) {
    const rest = req.path.replace(/^\/games/, '') || '/';
    return res.redirect(302, `https://www.amblyopia.games/games${rest}`);
  }
  next();
});

app.use((req, res) => {
  const host = (req.headers.host || '').split(':')[0];
  const root = LABS_HOSTS.includes(host) ? path.join(PUBLIC_DIR, 'labs') : PUBLIC_DIR;
  const decoded = decodeURIComponent(req.path);
  let filePath = path.join(root, decoded);

  if (!path.extname(filePath)) {
    filePath = path.join(filePath, 'index.html');
  }

  res.sendFile(filePath, err => {
    if (err) res.status(404).send('404 Not Found');
  });
});

// Global JSON error handler — must be last, after all routes
app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
  console.error(err);
  res.status(500).json({ error: 'Internal server error.' });
});

connectDB()
  .then(() => {
    app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
  })
  .catch(err => {
    console.error('Failed to connect to MongoDB:', err);
    process.exit(1);
  });
