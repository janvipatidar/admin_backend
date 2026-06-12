const escapeRegex = (str) => String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const toArray = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);
  return String(value)
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
};

const parseDate = (value, endOfDay = false) => {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  if (endOfDay) d.setHours(23, 59, 59, 999);
  else d.setHours(0, 0, 0, 0);
  return d;
};

const keywordClause = (term, scope) => {
  const re = new RegExp(escapeRegex(term), 'i');
  const fieldsByScope = {
    entire: [
      'name',
      'email',
      'designation',
      'education',
      'notes',
      'currentEmployer',
      'previousEmployer',
      'location',
      'city',
      'state',
      'keySkills',
      'resumeUrl'
    ],
    name: ['name'],
    skills: ['keySkills'],
    designation: ['designation']
  };
  const fields = fieldsByScope[scope] || fieldsByScope.entire;
  return {
    $or: fields.map((field) =>
      field === 'keySkills' ? { keySkills: re } : { [field]: re }
    )
  };
};

const buildAdvancedSearchQuery = (params = {}) => {
  const and = [];

  const includeKeywords = toArray(params.includeKeywords || params.keywords);
  const excludeKeywords = toArray(params.excludeKeywords);
  const keywordScope = params.keywordScope || 'entire';
  const keywordMatch = params.keywordMatch === 'all' ? 'all' : 'any';

  if (includeKeywords.length) {
    const clauses = includeKeywords.map((term) => keywordClause(term, keywordScope));
    and.push(keywordMatch === 'all' ? { $and: clauses } : { $or: clauses });
  }

  excludeKeywords.forEach((term) => {
    const clause = keywordClause(term, keywordScope);
    and.push({ $nor: [clause] });
  });

  const skills = toArray(params.skills || params.itSkills);
  if (skills.length) {
    and.push({
      $and: skills.map((skill) => ({
        keySkills: new RegExp(`^${escapeRegex(skill)}$`, 'i')
      }))
    });
  }

  if (params.experienceMin !== undefined && params.experienceMin !== '') {
    and.push({ experience: { $gte: Number(params.experienceMin) } });
  }
  if (params.experienceMax !== undefined && params.experienceMax !== '') {
    and.push({ experience: { $lte: Number(params.experienceMax) } });
  }

  const locations = toArray(params.locations || params.location);
  if (locations.length) {
    and.push({
      $or: locations.flatMap((loc) => {
        const re = new RegExp(escapeRegex(loc), 'i');
        return [{ location: re }, { city: re }, { state: re }];
      })
    });
  }

  if (params.ctcMin !== undefined && params.ctcMin !== '') {
    and.push({ currentCTC: { $gte: Number(params.ctcMin) } });
  }
  if (params.ctcMax !== undefined && params.ctcMax !== '') {
    and.push({ currentCTC: { $lte: Number(params.ctcMax) } });
  }

  if (params.department) {
    and.push({ department: new RegExp(escapeRegex(params.department), 'i') });
  }
  if (params.industry) {
    and.push({ currentIndustry: new RegExp(escapeRegex(params.industry), 'i') });
  }
  if (params.company) {
    and.push({
      $or: [
        { currentEmployer: new RegExp(escapeRegex(params.company), 'i') },
        { previousEmployer: new RegExp(escapeRegex(params.company), 'i') }
      ]
    });
  }
  if (params.designation) {
    and.push({ designation: new RegExp(escapeRegex(params.designation), 'i') });
  }

  const noticePeriods = toArray(params.noticePeriod);
  if (noticePeriods.length === 1) {
    and.push({ noticePeriod: new RegExp(escapeRegex(noticePeriods[0]), 'i') });
  } else if (noticePeriods.length > 1) {
    and.push({
      $or: noticePeriods.map((np) => ({
        noticePeriod: new RegExp(escapeRegex(np), 'i')
      }))
    });
  }

  if (params.ugQualification) {
    and.push({ ugQualification: new RegExp(escapeRegex(params.ugQualification), 'i') });
  }
  if (params.pgQualification) {
    and.push({ pgQualification: new RegExp(escapeRegex(params.pgQualification), 'i') });
  }
  if (params.education) {
    and.push({ education: new RegExp(escapeRegex(params.education), 'i') });
  }

  if (params.gender) {
    and.push({ gender: new RegExp(`^${escapeRegex(params.gender)}$`, 'i') });
  }

  if (params.hasResume === 'yes') {
    and.push({ resumeUrl: { $exists: true, $nin: ['', null] } });
  } else if (params.hasResume === 'no') {
    and.push({ $or: [{ resumeUrl: { $exists: false } }, { resumeUrl: '' }, { resumeUrl: null }] });
  }

  if (params.isActive === 'true' || params.isActive === true) {
    and.push({ isActive: true });
  } else if (params.isActive === 'false' || params.isActive === false) {
    and.push({ isActive: false });
  }

  if (params.status) {
    and.push({ status: params.status });
  }

  const createdFrom = parseDate(params.createdFrom);
  const createdTo = parseDate(params.createdTo, true);
  if (createdFrom || createdTo) {
    const range = {};
    if (createdFrom) range.$gte = createdFrom;
    if (createdTo) range.$lte = createdTo;
    and.push({ createdAt: range });
  }

  const updatedFrom = parseDate(params.updatedFrom);
  const updatedTo = parseDate(params.updatedTo, true);
  if (updatedFrom || updatedTo) {
    const range = {};
    if (updatedFrom) range.$gte = updatedFrom;
    if (updatedTo) range.$lte = updatedTo;
    and.push({ updatedAt: range });
  }

  return and.length ? { $and: and } : {};
};

const parseSort = (sortBy = 'createdAt', sortOrder = 'desc') => {
  const allowed = new Set([
    'createdAt',
    'updatedAt',
    'name',
    'experience',
    'currentCTC',
    'designation'
  ]);
  const field = allowed.has(sortBy) ? sortBy : 'createdAt';
  const order = String(sortOrder).toLowerCase() === 'asc' ? 1 : -1;
  return { [field]: order };
};

module.exports = {
  buildAdvancedSearchQuery,
  parseSort,
  toArray
};
