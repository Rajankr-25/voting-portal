const requireAuth = (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ success: false, message: 'Please log in to continue' });
  }
  next();
};

const requireAdmin = (req, res, next) => {
  if (!req.session.userId || req.session.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Admin access required' });
  }
  next();
};

const requireVoter = (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ success: false, message: 'Please log in to continue' });
  }
  if (req.session.role !== 'voter') {
    return res.status(403).json({ success: false, message: 'Voter access only' });
  }
  next();
};

module.exports = { requireAuth, requireAdmin, requireVoter };
