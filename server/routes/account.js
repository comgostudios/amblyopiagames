const { getDB } = require('../db');
const { Resend } = require('resend');
const jwt = require('jsonwebtoken');

const resend = new Resend(process.env.RESEND_API_KEY);

function generateOTP() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function getAccount(req, res, next) {
  try {
    const db = getDB();
    const user = await db.collection('users').findOne(
      { email: req.user.email },
      { projection: { _id: 0, email: 1, firstName: 1, lastName: 1, dateOfBirth: 1, role: 1, clinicCode: 1, createdAt: 1, lastLogin: 1, calibrationBg: 1 } }
    );
    if (!user) return res.status(404).json({ error: 'Account not found.' });
    res.json(user);
  } catch (err) {
    next(err);
  }
}

const DOB_RE = /^\d{4}-\d{2}-\d{2}$/;
const HEX_COLOR_RE = /^#[0-9a-f]{3}([0-9a-f]{3})?$/i;

async function updateAccount(req, res, next) {
  try {
    const { firstName, lastName, dateOfBirth, calibrationBg } = req.body;

    if (firstName !== undefined && typeof firstName !== 'string')
      return res.status(400).json({ error: 'Invalid firstName.' });
    if (lastName !== undefined && typeof lastName !== 'string')
      return res.status(400).json({ error: 'Invalid lastName.' });
    if (dateOfBirth !== undefined && (typeof dateOfBirth !== 'string' || !DOB_RE.test(dateOfBirth)))
      return res.status(400).json({ error: 'Date of birth must be in YYYY-MM-DD format.' });
    if (calibrationBg !== undefined && (typeof calibrationBg !== 'string' || !HEX_COLOR_RE.test(calibrationBg)))
      return res.status(400).json({ error: 'Invalid color.' });

    const update = {};
    if (firstName !== undefined) update.firstName = firstName.trim();
    if (lastName !== undefined) update.lastName = lastName.trim();
    if (dateOfBirth !== undefined) update.dateOfBirth = dateOfBirth;
    if (calibrationBg !== undefined) update.calibrationBg = calibrationBg.toLowerCase();
    if (!Object.keys(update).length)
      return res.status(400).json({ error: 'Nothing to update.' });

    const db = getDB();
    const user = await db.collection('users').findOneAndUpdate(
      { email: req.user.email },
      { $set: update },
      { returnDocument: 'after', projection: { _id: 0, firstName: 1, lastName: 1, dateOfBirth: 1 } }
    );
    if (!user) return res.status(404).json({ error: 'Account not found.' });
    res.json({ success: true, firstName: user.firstName, lastName: user.lastName, dateOfBirth: user.dateOfBirth });
  } catch (err) {
    next(err);
  }
}

async function requestEmailChange(req, res, next) {
  try {
    const { newEmail } = req.body;
    if (!newEmail || typeof newEmail !== 'string')
      return res.status(400).json({ error: 'New email is required.' });

    const newEmailLower = newEmail.toLowerCase().trim();
    const currentEmail = req.user.email;

    if (newEmailLower === currentEmail)
      return res.status(400).json({ error: 'That is already your email address.' });

    const db = getDB();
    const taken = await db.collection('users').findOne({ email: newEmailLower }, { projection: { _id: 1 } });
    if (taken)
      return res.status(409).json({ error: 'That email address is already in use.' });

    const COOLDOWN_MS = 60_000;
    const code = generateOTP();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 15 * 60 * 1000);

    const cutoff = new Date(now.getTime() - COOLDOWN_MS);
    await db.collection('otps').deleteOne({ email: newEmailLower, createdAt: { $lt: cutoff } });

    try {
      await db.collection('otps').insertOne({
        email: newEmailLower,
        code,
        expiresAt,
        createdAt: now,
        pendingEmailChangeFor: currentEmail,
      });
    } catch (e) {
      if (e.code === 11000) {
        const existing = await db.collection('otps').findOne({ email: newEmailLower }, { projection: { createdAt: 1 } });
        const wait = Math.ceil((existing.createdAt.getTime() + COOLDOWN_MS - Date.now()) / 1000);
        return res.status(429).json({ error: `A code was already sent. Please wait ${wait} second${wait === 1 ? '' : 's'}.` });
      }
      throw e;
    }

    await resend.emails.send({
      from: 'Amblyopia Labs <onboarding@resend.dev>',
      to: newEmailLower,
      subject: 'Verify your new email address — AmblyopiaLabs',
      html: `
        <div style="font-family:Georgia,serif;background:#0a0e1a;color:#e8eaf0;padding:48px 32px;max-width:480px;margin:0 auto">
          <h1 style="font-size:1.4rem;font-weight:normal;color:#fff;margin-bottom:8px">Amblyopia <span style="color:#4fc3f7">Labs</span></h1>
          <p style="color:#8899bb;margin-bottom:32px;font-size:0.9rem">Research Platform</p>
          <p style="color:#9aaac8;margin-bottom:24px">Your email change verification code is:</p>
          <div style="font-family:monospace;font-size:2.5rem;letter-spacing:12px;color:#4fc3f7;margin-bottom:32px">${code}</div>
          <p style="color:#8899bb;font-size:0.85rem">This code expires in 15 minutes. If you didn't request this, you can ignore this email.</p>
        </div>
      `,
    });

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

async function verifyEmailChange(req, res, next) {
  try {
    const { newEmail, code } = req.body;
    if (!newEmail || !code)
      return res.status(400).json({ error: 'New email and code are required.' });

    const newEmailLower = newEmail.toLowerCase().trim();
    const currentEmail = req.user.email;
    const db = getDB();

    const otp = await db.collection('otps').findOne({ email: newEmailLower });

    if (!otp || otp.pendingEmailChangeFor !== currentEmail)
      return res.status(401).json({ error: 'No verification code found. Please request a new one.' });
    if (new Date() > otp.expiresAt)
      return res.status(401).json({ error: 'Code has expired. Please request a new one.' });
    if (otp.code !== String(code))
      return res.status(401).json({ error: 'Incorrect code.' });

    await db.collection('otps').deleteOne({ email: newEmailLower });

    // Double-check new email still not taken (race condition guard)
    const taken = await db.collection('users').findOne({ email: newEmailLower }, { projection: { _id: 1 } });
    if (taken)
      return res.status(409).json({ error: 'That email address was just taken by another account.' });

    const user = await db.collection('users').findOneAndUpdate(
      { email: currentEmail },
      { $set: { email: newEmailLower } },
      { returnDocument: 'after' }
    );
    if (!user) return res.status(404).json({ error: 'Account not found.' });

    const token = jwt.sign(
      { email: user.email, role: user.role, id: user._id.toString() },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      success: true,
      token,
      user: { email: user.email, role: user.role, firstName: user.firstName, lastName: user.lastName },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { getAccount, updateAccount, requestEmailChange, verifyEmailChange };
