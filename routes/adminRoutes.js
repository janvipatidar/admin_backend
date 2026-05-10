// Admin routes - login + protected admin actions on candidates
const express = require('express');

const verifyToken = require('../middleware/verifyToken');
const { login, me } = require('../controllers/adminController');
const {
  listCandidates,
  candidateStats,
  getCandidate,
  updateCandidate,
  deleteCandidate,
  adminCreateCandidate
} = require('../controllers/candidateController');

const router = express.Router();

// Public auth endpoint
router.post('/login', login);

// Everything below this line requires a valid JWT
router.use(verifyToken);

router.get('/me', me);

// Candidate management (admin)
router.get('/candidates', listCandidates);
router.get('/candidates/stats', candidateStats);
router.post('/candidate', adminCreateCandidate);
router.get('/candidate/:id', getCandidate);
router.put('/candidate/:id', updateCandidate);
router.delete('/candidate/:id', deleteCandidate);

module.exports = router;
