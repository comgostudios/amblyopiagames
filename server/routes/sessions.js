const { getDB } = require('../db');
const { ObjectId } = require('mongodb');

async function startSession(req, res, next) {
  try {
    const { gameId, method } = req.body;
    if (!gameId) return res.status(400).json({ error: 'gameId is required.' });

    const db = getDB();
    const result = await db.collection('sessions').insertOne({
      userId: req.user.id,
      gameId,
      method: method || null,
      startedAt: new Date(),
      endedAt: null,
      durationSec: null,
      score: null,
      completed: false,
    });

    res.json({ sessionId: result.insertedId });
  } catch (err) {
    next(err);
  }
}

async function endSession(req, res, next) {
  try {
    const { score, completed } = req.body;
    const db = getDB();
    const now = new Date();

    const session = await db.collection('sessions').findOne(
      { _id: new ObjectId(req.params.id), userId: req.user.id, endedAt: null },
      { projection: { startedAt: 1 } }
    );

    if (!session) return res.status(404).json({ error: 'Session not found.' });

    const durationSec = Math.round((now - session.startedAt) / 1000);

    await db.collection('sessions').updateOne(
      { _id: session._id },
      { $set: { endedAt: now, durationSec, score: score ?? null, completed: !!completed } }
    );

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

async function getStats(req, res, next) {
  try {
    const { gameId } = req.query;
    if (!gameId) return res.status(400).json({ error: 'gameId is required.' });

    const db = getDB();
    const agg = await db.collection('sessions').aggregate([
      { $match: { userId: req.user.id, gameId, completed: true } },
      { $sort: { startedAt: 1 } },
      { $group: {
        _id: null,
        bestScore:        { $max: '$score' },
        avgScore:         { $avg: '$score' },
        totalSessions:    { $sum: 1 },
        totalDurationSec: { $sum: '$durationSec' },
        lastScore:        { $last: '$score' },
      }},
    ]).toArray();

    const s = agg[0] || {};
    res.json({
      bestScore:        s.bestScore                                          ?? null,
      avgScore:         s.avgScore != null ? Math.round(s.avgScore * 10) / 10 : null,
      totalSessions:    s.totalSessions    ?? 0,
      totalDurationSec: s.totalDurationSec ?? 0,
      lastScore:        s.lastScore        ?? null,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { startSession, endSession, getStats };
