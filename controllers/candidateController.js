// Candidate controller — handles public submission + admin CRUD + search
const Candidate = require('../models/Candidate');
const {
  addCandidateToSheet,
  updateCandidateInSheet
} = require('../utils/googleSheets');
const { validateCandidateFields } = require('../utils/validators');

const buildLocation = (body) => {
  if (body.location && String(body.location).trim()) {
    return String(body.location).trim();
  }
  const city = body.city ? String(body.city).trim() : '';
  const state = body.state ? String(body.state).trim() : '';
  if (city && state) return `${city}, ${state}`;
  return city || state || '';
};

// Helper: turn comma separated strings into arrays of trimmed values
const toArray = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);
  return String(value)
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
};

// Escape a string so it can be safely used inside a RegExp
const escapeRegex = (str) => String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Build a Mongo query object from candidate-list query params.
// Shared by the list endpoint and the Excel export endpoint.
const buildCandidateQuery = (params = {}) => {
  const {
    status,
    experience,
    experienceMin,
    experienceMax,
    location,
    industry,
    education,
    noticePeriod,
    skills,
    keyword
  } = params;

  const query = {};

  if (status) query.status = status;
  if (location) query.location = new RegExp(escapeRegex(location), 'i');
  if (industry) query.currentIndustry = new RegExp(escapeRegex(industry), 'i');
  if (education) query.education = new RegExp(escapeRegex(education), 'i');
  if (noticePeriod) query.noticePeriod = new RegExp(escapeRegex(noticePeriod), 'i');

  if (experience !== undefined && experience !== '') {
    query.experience = Number(experience);
  } else if (experienceMin !== undefined || experienceMax !== undefined) {
    query.experience = {};
    if (experienceMin !== undefined && experienceMin !== '') {
      query.experience.$gte = Number(experienceMin);
    }
    if (experienceMax !== undefined && experienceMax !== '') {
      query.experience.$lte = Number(experienceMax);
    }
  }

  const skillsArr = toArray(skills);
  if (skillsArr.length) {
    query.keySkills = {
      $in: skillsArr.map((s) => new RegExp(`^${escapeRegex(s)}$`, 'i'))
    };
  }

  if (keyword && String(keyword).trim()) {
    const re = new RegExp(escapeRegex(String(keyword).trim()), 'i');
    query.$or = [
      { name: re },
      { email: re },
      { keySkills: re },
      { currentEmployer: re },
      { previousEmployer: re }
    ];
  }

  return query;
};


// =====================================================================
// PUBLIC: create a candidate (used from the job application form)
// POST /api/candidate
// =====================================================================
const createCandidate = async (req, res) => {
  try {
    const body = req.body || {};

    const fieldErrors = validateCandidateFields(body);
    if (fieldErrors.length) {
      return res.status(400).json({ message: fieldErrors.join('. ') });
    }

    const resumeUrl =
      req.file && req.file.filename ? `/uploads/resumes/${req.file.filename}` : (body.resumeUrl || '');

    const candidate = await Candidate.create({
      name: body.name,
      email: body.email,
      phone: body.phone,
      dateOfBirth: body.dateOfBirth || null,
      education: body.education || '',
      experience: Number(body.experience) || 0,
      noticePeriod: body.noticePeriod || '',
      currentEmployer: body.currentEmployer || '',
      previousEmployer: body.previousEmployer || '',
      keySkills: toArray(body.keySkills),
      currentIndustry: body.currentIndustry || '',
      state: body.state || '',
      city: body.city || '',
      location: buildLocation(body),
      expectedSalary: Number(body.expectedSalary) || 0,
      resumeUrl,
      status: body.status || 'Applied',
      notes: body.notes || ''
    });

    // Fire-and-forget sync to Google Sheets — never block the response
    addCandidateToSheet(candidate);

    res.status(201).json({
      message: 'Candidate created successfully',
      candidate
    });
  } catch (err) {
    console.error('createCandidate error:', err);
    res.status(500).json({ message: 'Failed to create candidate' });
  }
};

// =====================================================================
// ADMIN: list candidates with filters, search, pagination
// GET /api/admin/candidates
// =====================================================================
const listCandidates = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100);
    const skip = (page - 1) * limit;

    const query = buildCandidateQuery(req.query);

    const [items, total] = await Promise.all([
      Candidate.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Candidate.countDocuments(query)
    ]);

    res.json({
      data: items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1
      }
    });
  } catch (err) {
    console.error('listCandidates error:', err);
    res.status(500).json({ message: 'Failed to fetch candidates' });
  }
};

// =====================================================================
// ADMIN: dashboard stats
// GET /api/admin/candidates/stats
// =====================================================================
const candidateStats = async (req, res) => {
  try {
    const [total, byStatus] = await Promise.all([
      Candidate.countDocuments({}),
      Candidate.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ])
    ]);

    // Default every known status to 0, then fill in real counts
    const stats = {
      total,
      Applied: 0,
      Shortlisted: 0,
      Interview: 0,
      Selected: 0,
      Rejected: 0,
      'On Hold': 0
    };
    byStatus.forEach((row) => {
      if (row._id) stats[row._id] = row.count;
    });

    res.json(stats);
  } catch (err) {
    console.error('candidateStats error:', err);
    res.status(500).json({ message: 'Failed to fetch stats' });
  }
};

// =====================================================================
// ADMIN: get single candidate
// GET /api/admin/candidate/:id
// =====================================================================
const getCandidate = async (req, res) => {
  try {
    const candidate = await Candidate.findById(req.params.id);
    if (!candidate) {
      return res.status(404).json({ message: 'Candidate not found' });
    }
    res.json(candidate);
  } catch (err) {
    console.error('getCandidate error:', err);
    res.status(500).json({ message: 'Failed to fetch candidate' });
  }
};

// =====================================================================
// ADMIN: update candidate (status, notes, anything)
// PUT /api/admin/candidate/:id
// =====================================================================
const updateCandidate = async (req, res) => {
  try {
    const updatable = [
      'name',
      'email',
      'phone',
      'dateOfBirth',
      'education',
      'experience',
      'noticePeriod',
      'currentEmployer',
      'previousEmployer',
      'keySkills',
      'currentIndustry',
      'state',
      'city',
      'location',
      'expectedSalary',
      'resumeUrl',
      'status',
      'notes'
    ];

    const updates = {};
    updatable.forEach((field) => {
      if (req.body[field] !== undefined) {
        if (field === 'keySkills') {
          updates.keySkills = toArray(req.body.keySkills);
        } else if (field === 'experience' || field === 'expectedSalary') {
          updates[field] = Number(req.body[field]) || 0;
        } else {
          updates[field] = req.body[field];
        }
      }
    });

    updates.updatedAt = new Date();

    const candidate = await Candidate.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    );

    if (!candidate) {
      return res.status(404).json({ message: 'Candidate not found' });
    }

    // Sync to Google Sheets in the background
    updateCandidateInSheet(candidate);

    res.json({ message: 'Candidate updated', candidate });
  } catch (err) {
    console.error('updateCandidate error:', err);
    res.status(500).json({ message: 'Failed to update candidate' });
  }
};

// =====================================================================
// ADMIN: delete candidate
// DELETE /api/admin/candidate/:id
// =====================================================================
const deleteCandidate = async (req, res) => {
  try {
    const candidate = await Candidate.findByIdAndDelete(req.params.id);
    if (!candidate) {
      return res.status(404).json({ message: 'Candidate not found' });
    }
    res.json({ message: 'Candidate deleted' });
  } catch (err) {
    console.error('deleteCandidate error:', err);
    res.status(500).json({ message: 'Failed to delete candidate' });
  }
};

// =====================================================================
// ADMIN: create candidate manually (admin form)
// POST /api/admin/candidate
// =====================================================================
const adminCreateCandidate = async (req, res) => {
  // Same as the public endpoint, but reachable only with a valid token.
  return createCandidate(req, res);
};

// =====================================================================
// ADMIN: bulk import from Excel (parsed JSON on client)
// POST /api/admin/candidates/import
// =====================================================================
const importCandidates = async (req, res) => {
  try {
    const rows = Array.isArray(req.body.candidates) ? req.body.candidates : [];
    if (!rows.length) {
      return res.status(400).json({ message: 'No candidates to import' });
    }

    const created = [];
    const failed = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i] || {};
      const payload = {
        name: row.name || row.Name || '',
        email: row.email || row.Email || '',
        phone: row.phone || row.Phone || '',
        education: row.education || row.Education || '',
        experience: row.experience ?? row['Experience (yrs)'] ?? 0,
        noticePeriod: row.noticePeriod || row['Notice Period'] || '',
        currentEmployer: row.currentEmployer || row['Current Employer'] || '',
        previousEmployer: row.previousEmployer || row['Previous Employer'] || '',
        currentIndustry: row.currentIndustry || row.Industry || '',
        state: row.state || row.State || '',
        city: row.city || row.City || '',
        location: row.location || row.Location || '',
        expectedSalary: row.expectedSalary ?? row['Expected Salary'] ?? 0,
        keySkills: row.keySkills || row.Skills || '',
        status: row.status || row.Status || 'Applied',
        resumeUrl: row.resumeUrl || row.Resume || '',
        notes: row.notes || row.Notes || ''
      };

      const errors = validateCandidateFields(payload);
      if (errors.length) {
        failed.push({ row: i + 1, name: payload.name, reason: errors.join('. ') });
        continue;
      }

      try {
        const candidate = await Candidate.create({
          name: payload.name,
          email: payload.email,
          phone: payload.phone,
          education: payload.education,
          experience: Number(payload.experience) || 0,
          noticePeriod: payload.noticePeriod,
          currentEmployer: payload.currentEmployer,
          previousEmployer: payload.previousEmployer,
          keySkills: toArray(payload.keySkills),
          currentIndustry: payload.currentIndustry,
          state: payload.state,
          city: payload.city,
          location: buildLocation(payload),
          expectedSalary: Number(payload.expectedSalary) || 0,
          resumeUrl: payload.resumeUrl,
          status: payload.status || 'Applied',
          notes: payload.notes
        });
        addCandidateToSheet(candidate);
        created.push(candidate);
      } catch (err) {
        failed.push({
          row: i + 1,
          name: payload.name,
          reason: err.message || 'Save failed'
        });
      }
    }

    return res.status(201).json({
      message: `Imported ${created.length} candidate(s)`,
      created: created.length,
      failed: failed.length,
      failures: failed
    });
  } catch (err) {
    console.error('importCandidates error:', err);
    return res.status(500).json({ message: 'Import failed' });
  }
};

module.exports = {
  createCandidate,
  listCandidates,
  candidateStats,
  getCandidate,
  updateCandidate,
  deleteCandidate,
  adminCreateCandidate,
  importCandidates
};
