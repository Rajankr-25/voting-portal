const mongoose = require('mongoose');

const candidateSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  party: { type: String, required: true, trim: true },
  bio: { type: String, default: '' },
  agenda: { type: String, default: '' },
  voteCount: { type: Number, default: 0 },
  color: { type: String, default: '#4f46e5' },
  symbol: { type: String, default: '⭐' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Candidate', candidateSchema);
