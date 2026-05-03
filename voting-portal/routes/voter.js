const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Candidate = require('../models/Candidate');
const Election = require('../models/Election');
const { requireVoter } = require('../middleware/auth');

// Cast vote
router.post('/vote', requireVoter, async (req, res) => {
  try {
    const { candidateId } = req.body;
    const userId = req.session.userId;

    const user = await User.findById(userId);
    if (user.hasVoted) {
      return res.status(400).json({ success: false, message: 'You have already cast your vote' });
    }

    const election = await Election.findOne();
    if (!election || election.status !== 'active') {
      return res.status(400).json({ success: false, message: 'Election is not currently active' });
    }

    const candidate = await Candidate.findById(candidateId);
    if (!candidate) {
      return res.status(404).json({ success: false, message: 'Candidate not found' });
    }

    // Atomic update
    await Candidate.findByIdAndUpdate(candidateId, { $inc: { voteCount: 1 } });
    await User.findByIdAndUpdate(userId, { hasVoted: true, votedFor: candidateId });

    res.json({ success: true, message: `Vote cast for ${candidate.name}` });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to cast vote' });
  }
});

module.exports = router;
