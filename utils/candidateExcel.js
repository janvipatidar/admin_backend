const { normalizePhone } = require('./validators');

const SHEET_NAME = 'Candidates';

const EXPORT_COLUMNS = [
  'Name',
  'Email',
  'Phone',
  'Designation',
  'Current CTC',
  'Education',
  'Experience (yrs)',
  'Notice Period',
  'Current Employer',
  'Previous Employer',
  'Industry',
  'State',
  'City',
  'Location',
  'Expected Salary',
  'Skills',
  'Status',
  'Active',
  'Resume',
  'Created At'
];

const REQUIRED_COLUMNS = ['Name', 'Email', 'Phone', 'Designation'];

const COLUMN_ALIASES = {
  name: ['Name', 'name'],
  email: ['Email', 'email'],
  phone: ['Phone', 'phone', 'Mobile', 'Mobile Number'],
  designation: ['Designation', 'designation', 'Current Designation'],
  currentCTC: ['Current CTC', 'currentCTC', 'CTC'],
  education: ['Education', 'education'],
  experience: ['Experience (yrs)', 'experience', 'Experience'],
  noticePeriod: ['Notice Period', 'noticePeriod'],
  currentEmployer: ['Current Employer', 'currentEmployer', 'Current Company'],
  previousEmployer: ['Previous Employer', 'previousEmployer'],
  currentIndustry: ['Industry', 'currentIndustry'],
  state: ['State', 'state'],
  city: ['City', 'city'],
  location: ['Location', 'location'],
  expectedSalary: ['Expected Salary', 'expectedSalary'],
  keySkills: ['Skills', 'keySkills'],
  status: ['Status', 'status'],
  isActive: ['Active', 'isActive'],
  resumeUrl: ['Resume', 'resumeUrl'],
  createdAt: ['Created At', 'createdAt']
};

const pickField = (row, keys) => {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null && String(row[key]).trim() !== '') {
      return row[key];
    }
  }
  return '';
};

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();

const parseActive = (value) => {
  const v = String(value ?? '').trim().toLowerCase();
  if (['no', 'false', '0', 'inactive'].includes(v)) return false;
  if (['yes', 'true', '1', 'active'].includes(v)) return true;
  return value !== false && value !== 'false' && value !== 0 && value !== '0';
};

const isEmptyRow = (row = {}) =>
  !Object.values(row).some((v) => String(v ?? '').trim() !== '');

const rowToPayload = (row = {}) => ({
  name: String(pickField(row, COLUMN_ALIASES.name)).trim(),
  email: String(pickField(row, COLUMN_ALIASES.email)).trim(),
  phone: String(pickField(row, COLUMN_ALIASES.phone)).trim(),
  designation: String(pickField(row, COLUMN_ALIASES.designation)).trim(),
  currentCTC: pickField(row, COLUMN_ALIASES.currentCTC),
  department: '',
  education: String(pickField(row, COLUMN_ALIASES.education)).trim(),
  ugQualification: '',
  pgQualification: '',
  gender: '',
  experience: pickField(row, COLUMN_ALIASES.experience),
  noticePeriod: String(pickField(row, COLUMN_ALIASES.noticePeriod)).trim(),
  currentEmployer: String(pickField(row, COLUMN_ALIASES.currentEmployer)).trim(),
  previousEmployer: String(pickField(row, COLUMN_ALIASES.previousEmployer)).trim(),
  currentIndustry: String(pickField(row, COLUMN_ALIASES.currentIndustry)).trim(),
  state: String(pickField(row, COLUMN_ALIASES.state)).trim(),
  city: String(pickField(row, COLUMN_ALIASES.city)).trim(),
  location: String(pickField(row, COLUMN_ALIASES.location)).trim(),
  expectedSalary: pickField(row, COLUMN_ALIASES.expectedSalary),
  keySkills: pickField(row, COLUMN_ALIASES.keySkills),
  status: String(pickField(row, COLUMN_ALIASES.status) || 'Applied').trim(),
  resumeUrl: String(pickField(row, COLUMN_ALIASES.resumeUrl)).trim(),
  isActive: parseActive(pickField(row, COLUMN_ALIASES.isActive))
});

const candidateToExportRow = (c) => ({
  Name: c.name || '',
  Email: c.email || '',
  Phone: c.phone || '',
  Designation: c.designation || '',
  'Current CTC': c.currentCTC != null ? c.currentCTC : '',
  Education: c.education || '',
  'Experience (yrs)': c.experience != null ? c.experience : '',
  'Notice Period': c.noticePeriod || '',
  'Current Employer': c.currentEmployer || '',
  'Previous Employer': c.previousEmployer || '',
  Industry: c.currentIndustry || '',
  State: c.state || '',
  City: c.city || '',
  Location: c.location || '',
  'Expected Salary': c.expectedSalary != null ? c.expectedSalary : '',
  Skills: Array.isArray(c.keySkills) ? c.keySkills.join(', ') : '',
  Status: c.status || '',
  Active: c.isActive ? 'Yes' : 'No',
  Resume: c.resumeUrl || '',
  'Created At': c.createdAt ? new Date(c.createdAt).toLocaleDateString() : ''
});

const validateImportHeaders = (row = {}) => {
  const headers = Object.keys(row);
  const missing = REQUIRED_COLUMNS.filter(
    (col) => !headers.some((h) => h.trim().toLowerCase() === col.toLowerCase())
  );
  return missing;
};

/** In-file + DB duplicate key: mobile first, then email, then combo */
const duplicateKey = (payload) => {
  const phone = normalizePhone(payload.phone);
  const email = normalizeEmail(payload.email);
  if (phone) return `phone:${phone}`;
  if (email) return `email:${email}`;
  if (phone && email) return `combo:${phone}:${email}`;
  return null;
};

const isDuplicateCandidate = (payload, existingPhones, existingEmails) => {
  const phone = normalizePhone(payload.phone);
  const email = normalizeEmail(payload.email);

  if (phone && existingPhones.has(phone)) {
    return { duplicate: true, reason: 'Mobile number already exists' };
  }
  if (email && existingEmails.has(email)) {
    return { duplicate: true, reason: 'Email already exists' };
  }
  return { duplicate: false };
};

module.exports = {
  SHEET_NAME,
  EXPORT_COLUMNS,
  REQUIRED_COLUMNS,
  isEmptyRow,
  rowToPayload,
  candidateToExportRow,
  validateImportHeaders,
  duplicateKey,
  isDuplicateCandidate,
  normalizeEmail,
  normalizePhoneForDup: normalizePhone
};
