const express = require('express');
const router = express.Router();
const Candidate = require('../models/Candidate');
const Election = require('../models/Election');
const User = require('../models/User');

// Get election status and info
router.get('/election', async (req, res) => {
  try {
    const election = await Election.findOne();
    res.json({ success: true, election: election || { status: 'pending', title: 'General Election', description: '' } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch election data' });
  }
});

// Get all candidates
router.get('/candidates', async (req, res) => {
  try {
    const candidates = await Candidate.find().sort({ createdAt: 1 });
    res.json({ success: true, candidates });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch candidates' });
  }
});

// Get results (available when election is active or ended)
router.get('/results', async (req, res) => {
  try {
    const election = await Election.findOne();
    if (!election || election.status === 'pending') {
      return res.status(403).json({ success: false, message: 'Results not available yet' });
    }
    const candidates = await Candidate.find().sort({ voteCount: -1 });
    const totalVotes = candidates.reduce((sum, c) => sum + c.voteCount, 0);
    const totalVoters = await User.countDocuments({ role: 'voter' });
    res.json({ success: true, candidates, totalVotes, totalVoters, election });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch results' });
  }
});

// Admin stats
router.get('/admin/stats', async (req, res) => {
  if (!req.session.userId || req.session.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Unauthorized' });
  }
  try {
    const totalVoters = await User.countDocuments({ role: 'voter' });
    const votedCount = await User.countDocuments({ role: 'voter', hasVoted: true });
    const candidates = await Candidate.find().sort({ voteCount: -1 });
    const election = await Election.findOne();
    const totalVotes = candidates.reduce((sum, c) => sum + c.voteCount, 0);

    res.json({
      success: true,
      stats: { totalVoters, votedCount, totalVotes, turnout: totalVoters ? Math.round((votedCount / totalVoters) * 100) : 0 },
      candidates,
      election: election || { status: 'pending', title: 'General Election' }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch stats' });
  }
});

module.exports = router;
