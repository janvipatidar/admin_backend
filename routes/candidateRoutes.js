// Public candidate routes - used by the job application form on the website
const express = require('express');
const { createCandidate } = require('../controllers/candidateController');
const { uploadResume } = require('../middleware/uploadResume');

const router = express.Router();

// POST /api/candidate
router.post('/', uploadResume.single('resume'), createCandidate);

module.exports = router;
