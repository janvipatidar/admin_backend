const { validateEducation } = require('./candidateOptions');
const { isValidCurrentCTC } = require('./ctc');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
// India-friendly: 10 digits, optional +91 prefix
const PHONE_RE = /^(?:\+91[\-\s]?)?[6-9]\d{9}$/;

const normalizePhone = (phone) =>
  String(phone || '')
    .trim()
    .replace(/[\s\-()]/g, '');

const isValidEmail = (email) => EMAIL_RE.test(String(email || '').trim());

const isValidPhone = (phone) => {
  const p = normalizePhone(phone);
  if (/^\+91[6-9]\d{9}$/.test(p)) return true;
  if (/^[6-9]\d{9}$/.test(p)) return true;
  return false;
};

const validateContactFields = ({ name, email, phone, message }) => {
  const errors = [];
  if (!String(name || '').trim()) errors.push('Name is required');
  if (!isValidEmail(email)) errors.push('Valid email is required');
  if (!isValidPhone(phone)) errors.push('Valid 10-digit Indian phone number is required');
  if (!String(message || '').trim()) errors.push('Message is required');
  return errors;
};

const resolveCity = (body = {}) => {
  const city = String(body.city || '').trim();
  if (city.toLowerCase() === 'other') {
    return String(body.customCity || '').trim();
  }
  return city;
};

const validateCandidateFields = (body = {}, { forImport = false } = {}) => {
  const { name, email, phone, designation, currentCTC, city, customCity, location, state } = body;
  const errors = [];
  if (!String(name || '').trim()) errors.push('Name is required');
  if (!isValidEmail(email)) errors.push('Valid email is required');
  if (!isValidPhone(phone)) errors.push('Valid 10-digit Indian phone number is required');
  if (!String(designation || '').trim()) errors.push('Designation is required');
  if (!isValidCurrentCTC(currentCTC)) {
    errors.push('Current CTC is required');
  }

  if (forImport) {
    const hasLocation =
      String(location || '').trim() ||
      String(city || '').trim() ||
      String(state || '').trim();
    if (!hasLocation) errors.push('City or location is required');
  } else {
    if (!String(city || '').trim()) errors.push('City is required');
    if (String(city || '').trim().toLowerCase() === 'other' && !String(customCity || '').trim()) {
      errors.push('Custom city is required when Other is selected');
    }
    if (!resolveCity(body) && String(city || '').trim()) {
      errors.push('Valid city is required');
    }
  }

  if (!forImport) {
    const educationErr = validateEducation(body.education, { required: true });
    if (educationErr) errors.push(educationErr);
  }

  return errors;
};

const validateImportCandidateFields = (body = {}) =>
  validateCandidateFields(body, { forImport: true });

module.exports = {
  isValidEmail,
  isValidPhone,
  normalizePhone,
  validateContactFields,
  validateCandidateFields,
  validateImportCandidateFields
};
