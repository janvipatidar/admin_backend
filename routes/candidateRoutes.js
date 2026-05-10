// Public candidate routes - used by the job application form on the website
const express = require('express');
const { createCandidate } = require('../controllers/candidateController');

const router = express.Router();

// POST /api/candidate
router.post('/', createCandidate);

module.exports = router;
