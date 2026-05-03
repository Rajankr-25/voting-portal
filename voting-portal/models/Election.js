const mongoose = require('mongoose');

const electionSchema = new mongoose.Schema({
  title: { type: String, default: 'General Election 2024' },
  status: { type: String, enum: ['pending', 'active', 'ended'], default: 'pending' },
  startedAt: { type: Date },
  endedAt: { type: Date },
  description: { type: String, default: '' }
});

module.exports = mongoose.model('Election', electionSchema);
