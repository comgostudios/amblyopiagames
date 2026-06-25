const { getDB } = require('../db');
const { Resend } = require('resend');
const jwt = require('jsonwebtoken');

const resend = new Resend(process.env.RESEND_API_KEY);

function generateOTP() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function uniqueClinicCode(db) {
  let code;
  do {
    code = String(Math.floor(100000 + Math.random() * 900000));
  } while (await db.collection('users').findOne({ clinicCode: code }, { projection: { _id: 1 } }));
  return code;
}

async function requestPasscode(req, res, next) {
  try {
    const { email, role } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required.' });
    }
    if (role && !['patient', 'clinician'].includes(role)) {
      return res.status(400).json({ error: 'Role must be patient or clinician.' });
    }

    const emailLower = email.toLowerCase().trim();
    const db = getDB();

    // Sign-in: verify the account exists before sending a code
    if (!role) {
      const exists = await db.collection('users').findOne({ email: emailLower }, { projection: { _id: 1 } });
      if (!exists) {
        return res.status(404).json({ error: 'No account found for that email. Please sign up first.' });
      }
    }

    const COOLDOWN_MS = 60_000;
    const code = generateOTP();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 15 * 60 * 1000);

    // Pending sign-up data lives in the OTP document — no user record until verified
    const otpDoc = { email: emailLower, code, expiresAt, createdAt: now };
    if (role) {
      otpDoc.pendingRole = role;
    }

    const cutoff = new Date(now.getTime() - COOLDOWN_MS);
    await db.collection('otps').deleteOne({ email: emailLower, createdAt: { $lt: cutoff } });

    try {
      await db.collection('otps').insertOne(otpDoc);
    } catch (e) {
      if (e.code === 11000) {
        const existing = await db.collection('otps').findOne({ email: emailLower }, { projection: { createdAt: 1 } });
        const wait = Math.ceil((existing.createdAt.getTime() + COOLDOWN_MS - Date.now()) / 1000);
        return res.status(429).json({ error: `A passcode was already sent. Please wait ${wait} second${wait === 1 ? '' : 's'} before requesting another.` });
      }
      throw e;
    }

    await resend.emails.send({
      from: 'Amblyopia Labs <onboarding@resend.dev>',
      to: emailLower,
      subject: 'Your Amblyopia Labs passcode',
      html: `
        <div style="font-family:Georgia,serif;background:#0a0e1a;color:#e8eaf0;padding:48px 32px;max-width:480px;margin:0 auto">
          <h1 style="font-size:1.4rem;font-weight:normal;color:#fff;margin-bottom:8px">Amblyopia <span style="color:#4fc3f7">Labs</span></h1>
          <p style="color:#8899bb;margin-bottom:32px;font-size:0.9rem">Research Platform</p>
          <p style="color:#9aaac8;margin-bottom:24px">Your sign-in passcode is:</p>
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

async function verifyPasscode(req, res, next) {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({ error: 'Email and code are required.' });
    }

    const emailLower = email.toLowerCase().trim();
    const db = getDB();

    const otp = await db.collection('otps').findOne({ email: emailLower });

    if (!otp) {
      return res.status(401).json({ error: 'No passcode found for this email. Please request a new one.' });
    }
    if (new Date() > otp.expiresAt) {
      return res.status(401).json({ error: 'Passcode has expired. Please request a new one.' });
    }
    if (otp.code !== String(code)) {
      return res.status(401).json({ error: 'Incorrect passcode.' });
    }

    await db.collection('otps').deleteOne({ email: emailLower });

    const now = new Date();
    let user;

    if (otp.pendingRole) {
      // Sign-up: create user now that email is verified.
      // $setOnInsert holds immutable fields (email, createdAt, clinicCode).
      // $set holds fields that should also refresh on re-registration.
      const onInsert = { email: emailLower, createdAt: now };
      if (otp.pendingRole === 'clinician') onInsert.clinicCode = await uniqueClinicCode(db);

      user = await db.collection('users').findOneAndUpdate(
        { email: emailLower },
        { $set: { role: otp.pendingRole, lastLogin: now, verified: true }, $setOnInsert: onInsert },
        { upsert: true, returnDocument: 'after' }
      );
    } else {
      // Sign-in: update existing user
      user = await db.collection('users').findOneAndUpdate(
        { email: emailLower },
        { $set: { lastLogin: now, verified: true } },
        { returnDocument: 'after' }
      );
    }

    if (!user) {
      return res.status(404).json({ error: 'Account not found. Please sign up first.' });
    }

    const token = jwt.sign(
      { email: user.email, role: user.role, id: user._id.toString() },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      success: true,
      token,
      user: {
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { requestPasscode, verifyPasscode };
