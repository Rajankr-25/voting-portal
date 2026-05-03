const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Candidate = require('../models/Candidate');
const Election = require('../models/Election');
const { requireAdmin } = require('../middleware/auth');

// Add candidate
router.post('/candidates', requireAdmin, async (req, res) => {
  try {
    const { name, party, bio, agenda, color, symbol } = req.body;
    if (!name || !party) {
      return res.status(400).json({ success: false, message: 'Name and party required' });
    }
    const candidate = new Candidate({ name, party, bio, agenda, color, symbol });
    await candidate.save();
    res.json({ success: true, candidate });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to add candidate' });
  }
});

// Delete candidate
router.delete('/candidates/:id', requireAdmin, async (req, res) => {
  try {
    const election = await Election.findOne();
    if (election && election.status === 'active') {
      return res.status(400).json({ success: false, message: 'Cannot delete candidates during active election' });
    }
    await Candidate.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete candidate' });
  }
});

// Update election status
router.post('/election/control', requireAdmin, async (req, res) => {
  try {
    const { action, title, description } = req.body;
    let election = await Election.findOne();

    if (!election) {
      election = new Election();
    }

    if (action === 'start') {
      if (election.status === 'active') {
        return res.status(400).json({ success: false, message: 'Election already active' });
      }
      const candidates = await Candidate.countDocuments();
      if (candidates < 2) {
        return res.status(400).json({ success: false, message: 'Add at least 2 candidates before starting' });
      }
      election.status = 'active';
      election.startedAt = new Date();
      if (title) election.title = title;
      if (description) election.description = description;
    } else if (action === 'stop') {
      if (election.status !== 'active') {
        return res.status(400).json({ success: false, message: 'No active election to stop' });
      }
      election.status = 'ended';
      election.endedAt = new Date();
    } else if (action === 'reset') {
      election.status = 'pending';
      election.startedAt = null;
      election.endedAt = null;
      await Candidate.updateMany({}, { voteCount: 0 });
      await User.updateMany({}, { hasVoted: false, votedFor: null });
    } else {
      return res.status(400).json({ success: false, message: 'Invalid action' });
    }

    await election.save();
    res.json({ success: true, election });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update election' });
  }
});

// Get all voters
router.get('/voters', requireAdmin, async (req, res) => {
  try {
    const voters = await User.find({ role: 'voter' })
      .select('-password')
      .populate('votedFor', 'name party');
    res.json({ success: true, voters });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch voters' });
  }
});

// Update election title/description
router.put('/election', requireAdmin, async (req, res) => {
  try {
    const { title, description } = req.body;
    let election = await Election.findOne();
    if (!election) election = new Election();
    if (title) election.title = title;
    if (description) election.description = description;
    await election.save();
    res.json({ success: true, election });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update election' });
  }
});

module.exports = router;
