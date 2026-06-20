// Candidate controller — public submission + admin CRUD + advanced search
const Candidate = require('../models/Candidate');
const CandidateComment = require('../models/CandidateComment');
const {
  addCandidateToSheet,
  updateCandidateInSheet
} = require('../utils/googleSheets');
const { validateCandidateFields, validateImportCandidateFields } = require('../utils/validators');
const { normalizeCurrentCTC } = require('../utils/ctc');
const { deleteResumeFile } = require('../utils/resumeFiles');
const { deleteCommentsForCandidate } = require('../controllers/commentController');
const {
  buildAdvancedSearchQuery,
  parseSort,
  toArray
} = require('../utils/candidateSearch');
const { resolveCity } = require('../utils/city');
const {
  isEmptyRow,
  rowToPayload,
  duplicateKey,
  isDuplicateCandidate,
  normalizeEmail,
  normalizePhoneForDup,
  validateImportHeaders,
  SHEET_NAME
} = require('../utils/candidateExcel');

const buildLocation = (body) => {
  if (body.location && String(body.location).trim()) {
    return String(body.location).trim();
  }
  const city = resolveCity(body);
  const state = body.state ? String(body.state).trim() : '';
  if (city && state) return `${city}, ${state}`;
  return city || state || '';
};

const buildCandidateDoc = (body, resumeUrl = '') => ({
  name: String(body.name).trim(),
  email: String(body.email).trim(),
  phone: String(body.phone).trim(),
  designation: String(body.designation || '').trim(),
  currentCTC: normalizeCurrentCTC(body.currentCTC),
  department: String(body.department || '').trim(),
  dateOfBirth: body.dateOfBirth || null,
  education: body.education || '',
  ugQualification: body.ugQualification || '',
  pgQualification: body.pgQualification || '',
  gender: body.gender || '',
  experience: Number(body.experience) || 0,
  noticePeriod: body.noticePeriod || '',
  currentEmployer: body.currentEmployer || '',
  previousEmployer: body.previousEmployer || '',
  keySkills: toArray(body.keySkills),
  currentIndustry: body.currentIndustry || '',
  state: body.state || '',
  city: resolveCity(body),
  location: buildLocation(body),
  expectedSalary: Number(body.expectedSalary) || 0,
  resumeUrl,
  status: body.status || 'Applied',
  isActive: body.isActive !== false && body.isActive !== 'false'
});

// =====================================================================
// PUBLIC: create candidate
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

    const candidate = await Candidate.create(buildCandidateDoc(body, resumeUrl));
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

const buildCandidateListQuery = (search) => {
  const term = String(search || '').trim();
  if (!term) return {};

  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(escaped, 'i');

  const or = [
    { name: re },
    { email: re },
    { phone: re },
    { location: re },
    { city: re },
    { state: re },
    {
      $expr: {
        $regexMatch: {
          input: { $toString: '$experience' },
          regex: escaped,
          options: 'i'
        }
      }
    }
  ];

  return { $or: or };
};

// =====================================================================
// ADMIN: simple candidate list (management table)
// GET /api/admin/candidates
// =====================================================================
const listCandidates = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100);
    const skip = (page - 1) * limit;
    const sort = parseSort(req.query.sortBy, req.query.sortOrder);
    const filter = buildCandidateListQuery(req.query.search);

    const [items, total] = await Promise.all([
      Candidate.find(filter).sort(sort).skip(skip).limit(limit).lean(),
      Candidate.countDocuments(filter)
    ]);

    const ids = items.map((c) => c._id);
    const commentStats = ids.length
      ? await CandidateComment.aggregate([
          { $match: { candidateId: { $in: ids } } },
          { $sort: { createdAt: -1 } },
          {
            $group: {
              _id: '$candidateId',
              commentCount: { $sum: 1 },
              latestComment: { $first: '$comment' }
            }
          }
        ])
      : [];

    const statsMap = Object.fromEntries(
      commentStats.map((s) => [String(s._id), s])
    );

    const enriched = items.map((c) => {
      const stats = statsMap[String(c._id)] || {};
      return {
        ...c,
        commentCount: stats.commentCount || 0,
        latestComment: stats.latestComment || ''
      };
    });

    res.json({
      data: enriched,
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
// ADMIN: advanced search (Naukri-style filters)
// GET /api/admin/candidates/search
// =====================================================================
const searchCandidates = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 160);
    const skip = (page - 1) * limit;
    const query = buildAdvancedSearchQuery(req.query);
    const sort = parseSort(req.query.sortBy, req.query.sortOrder);

    const [items, total] = await Promise.all([
      Candidate.find(query).sort(sort).skip(skip).limit(limit),
      Candidate.countDocuments(query)
    ]);

    res.json({
      data: items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1
      },
      resultCount: total
    });
  } catch (err) {
    console.error('searchCandidates error:', err);
    res.status(500).json({ message: 'Search failed' });
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
      Candidate.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }])
    ]);

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
// ADMIN: update candidate
// PUT /api/admin/candidate/:id
// =====================================================================
const updateCandidate = async (req, res) => {
  try {
    const updatable = [
      'name',
      'email',
      'phone',
      'designation',
      'currentCTC',
      'department',
      'dateOfBirth',
      'education',
      'ugQualification',
      'pgQualification',
      'gender',
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
      'isActive'
    ];

    const updates = {};
    updatable.forEach((field) => {
      if (req.body[field] !== undefined) {
        if (field === 'keySkills') {
          updates.keySkills = toArray(req.body.keySkills);
        } else if (field === 'experience' || field === 'expectedSalary') {
          updates[field] = Number(req.body[field]) || 0;
        } else if (field === 'currentCTC') {
          updates[field] = normalizeCurrentCTC(req.body[field]);
        } else if (field === 'isActive') {
          updates.isActive = req.body.isActive !== false && req.body.isActive !== 'false';
        } else {
          updates[field] = req.body[field];
        }
      }
    });

    if (req.body.city !== undefined || req.body.state !== undefined || req.body.location !== undefined) {
      updates.location = buildLocation({ ...req.body, ...updates });
    }

    if (updates.email || updates.phone || updates.designation !== undefined || updates.currentCTC !== undefined) {
      const existing = await Candidate.findById(req.params.id);
      if (!existing) {
        return res.status(404).json({ message: 'Candidate not found' });
      }
      const check = validateCandidateFields({
        name: updates.name || existing.name,
        email: updates.email || existing.email,
        phone: updates.phone || existing.phone,
        designation: updates.designation !== undefined ? updates.designation : existing.designation,
        currentCTC: updates.currentCTC !== undefined ? updates.currentCTC : existing.currentCTC
      });
      if (check.length) {
        return res.status(400).json({ message: check.join('. ') });
      }
    }

    updates.updatedAt = new Date();

    const candidate = await Candidate.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true
    });

    if (!candidate) {
      return res.status(404).json({ message: 'Candidate not found' });
    }

    updateCandidateInSheet(candidate);
    res.json({ message: 'Candidate updated', candidate });
  } catch (err) {
    console.error('updateCandidate error:', err);
    res.status(500).json({ message: 'Failed to update candidate' });
  }
};

// =====================================================================
// ADMIN: delete single candidate + resume file
// DELETE /api/admin/candidate/:id
// =====================================================================
const deleteCandidate = async (req, res) => {
  try {
    const candidate = await Candidate.findByIdAndDelete(req.params.id);
    if (!candidate) {
      return res.status(404).json({ message: 'Candidate not found' });
    }
    deleteResumeFile(candidate.resumeUrl);
    await deleteCommentsForCandidate(req.params.id);
    res.json({ message: 'Candidate deleted' });
  } catch (err) {
    console.error('deleteCandidate error:', err);
    res.status(500).json({ message: 'Failed to delete candidate' });
  }
};

// =====================================================================
// ADMIN: bulk delete
// POST /api/admin/candidates/bulk-delete
// =====================================================================
const bulkDeleteCandidates = async (req, res) => {
  try {
    const ids = Array.isArray(req.body.ids) ? req.body.ids.filter(Boolean) : [];
    if (!ids.length) {
      return res.status(400).json({ message: 'No candidates selected' });
    }

    const deleted = [];
    const failed = [];

    for (const id of ids) {
      try {
        const candidate = await Candidate.findByIdAndDelete(id);
        if (!candidate) {
          failed.push({ id, reason: 'Not found' });
          continue;
        }
        deleteResumeFile(candidate.resumeUrl);
        await deleteCommentsForCandidate(id);
        deleted.push(id);
      } catch (err) {
        failed.push({ id, reason: err.message || 'Delete failed' });
      }
    }

    res.json({
      message: `Deleted ${deleted.length} candidate(s)`,
      deleted: deleted.length,
      failed: failed.length,
      failures: failed
    });
  } catch (err) {
    console.error('bulkDeleteCandidates error:', err);
    res.status(500).json({ message: 'Bulk delete failed' });
  }
};

const adminCreateCandidate = async (req, res) => createCandidate(req, res);

// =====================================================================
// ADMIN: bulk import
// POST /api/admin/candidates/import
// =====================================================================
const importCandidates = async (req, res) => {
  try {
    const rows = Array.isArray(req.body.candidates) ? req.body.candidates : [];
    if (!rows.length) {
      return res.status(400).json({ message: 'Excel file has no data rows' });
    }

    const firstDataRow = rows.find((r) => !isEmptyRow(r));
    if (!firstDataRow) {
      return res.status(400).json({ message: 'Excel file contains only empty rows' });
    }

    const missingHeaders = validateImportHeaders(firstDataRow);
    if (missingHeaders.length) {
      return res.status(400).json({
        message: `Missing required columns: ${missingHeaders.join(', ')}`
      });
    }

    const existing = await Candidate.find({}).select('email phone').lean();
    const existingEmails = new Set(
      existing.map((c) => normalizeEmail(c.email)).filter(Boolean)
    );
    const existingPhones = new Set(
      existing.map((c) => normalizePhoneForDup(c.phone)).filter(Boolean)
    );

    const seenInFile = new Set();
    const created = [];
    const duplicates = [];
    const skipped = [];
    const failed = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i] || {};
      if (isEmptyRow(row)) {
        skipped.push({ row: i + 2, reason: 'Empty row' });
        continue;
      }

      const payload = rowToPayload(row);
      const key = duplicateKey(payload);

      if (!key) {
        failed.push({ row: i + 2, name: payload.name, reason: 'Mobile or email is required' });
        continue;
      }

      if (seenInFile.has(key)) {
        duplicates.push({
          row: i + 2,
          name: payload.name,
          reason: 'Duplicate row in file'
        });
        continue;
      }
      seenInFile.add(key);

      const dupCheck = isDuplicateCandidate(payload, existingPhones, existingEmails);
      if (dupCheck.duplicate) {
        duplicates.push({
          row: i + 2,
          name: payload.name,
          reason: dupCheck.reason
        });
        continue;
      }

      const errors = validateImportCandidateFields(payload);
      if (errors.length) {
        failed.push({ row: i + 2, name: payload.name, reason: errors.join('. ') });
        continue;
      }

      try {
        const candidate = await Candidate.create(
          buildCandidateDoc(payload, payload.resumeUrl)
        );
        addCandidateToSheet(candidate);
        created.push(candidate);

        if (payload.email) existingEmails.add(normalizeEmail(payload.email));
        if (payload.phone) existingPhones.add(normalizePhoneForDup(payload.phone));
      } catch (err) {
        failed.push({
          row: i + 2,
          name: payload.name,
          reason: err.message || 'Save failed'
        });
      }
    }

    return res.status(201).json({
      message: `Imported ${created.length} candidate(s)`,
      imported: created.length,
      skipped: skipped.length,
      duplicates: duplicates.length,
      failed: failed.length,
      sheetName: SHEET_NAME,
      failures: failed,
      duplicateRows: duplicates,
      skippedRows: skipped
    });
  } catch (err) {
    console.error('importCandidates error:', err);
    return res.status(500).json({ message: 'Import failed' });
  }
};

module.exports = {
  createCandidate,
  listCandidates,
  searchCandidates,
  candidateStats,
  getCandidate,
  updateCandidate,
  deleteCandidate,
  bulkDeleteCandidates,
  adminCreateCandidate,
  importCandidates
};
