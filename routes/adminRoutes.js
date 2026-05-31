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
  adminCreateCandidate,
  importCandidates
} = require('../controllers/candidateController');
const {
  listContactMessages,
  deleteContactMessage
} = require('../controllers/contactController');

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
router.post('/candidates/import', importCandidates);
router.get('/contacts', listContactMessages);
router.delete('/contacts/:id', deleteContactMessage);
router.get('/candidate/:id', getCandidate);
router.put('/candidate/:id', updateCandidate);
router.delete('/candidate/:id', deleteCandidate);

module.exports = router;
