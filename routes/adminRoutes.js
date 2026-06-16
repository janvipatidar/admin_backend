// Admin routes - login + protected admin actions on candidates
const express = require('express');

const verifyToken = require('../middleware/verifyToken');
const { login, me } = require('../controllers/adminController');
const { uploadResume } = require('../middleware/uploadResume');
const {
  listCandidates,
  searchCandidates,
  candidateStats,
  getCandidate,
  updateCandidate,
  deleteCandidate,
  bulkDeleteCandidates,
  adminCreateCandidate,
  importCandidates
} = require('../controllers/candidateController');
const {
  listContactMessages,
  deleteContactMessage
} = require('../controllers/contactController');
const {
  listCandidateComments,
  createCandidateComment,
  updateCandidateComment,
  deleteCandidateComment
} = require('../controllers/commentController');

const router = express.Router();

// Public auth endpoint
router.post('/login', login);

// Everything below this line requires a valid JWT
router.use(verifyToken);

router.get('/me', me);

// Candidate management (admin)
router.get('/candidates', listCandidates);
router.get('/candidates/search', searchCandidates);
router.get('/candidates/stats', candidateStats);
router.post('/candidate', uploadResume.single('resume'), adminCreateCandidate);
router.post('/candidates/import', importCandidates);
router.post('/candidates/bulk-delete', bulkDeleteCandidates);
router.get('/contacts', listContactMessages);
router.delete('/contacts/:id', deleteContactMessage);
router.get('/candidate/:id', getCandidate);
router.get('/candidate/:id/comments', listCandidateComments);
router.post('/candidate/:id/comments', createCandidateComment);
router.put('/candidate/comments/:commentId', updateCandidateComment);
router.delete('/candidate/comments/:commentId', deleteCandidateComment);
router.put('/candidate/:id', updateCandidate);
router.delete('/candidate/:id', deleteCandidate);

module.exports = router;
