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

const validateCandidateFields = (body = {}) => {
  const { name, email, phone, designation, currentCTC, city, customCity } = body;
  const errors = [];
  if (!String(name || '').trim()) errors.push('Name is required');
  if (!isValidEmail(email)) errors.push('Valid email is required');
  if (!isValidPhone(phone)) errors.push('Valid 10-digit Indian phone number is required');
  if (!String(designation || '').trim()) errors.push('Designation is required');
  if (currentCTC === undefined || currentCTC === null || currentCTC === '') {
    errors.push('Current CTC is required');
  } else if (Number.isNaN(Number(currentCTC)) || Number(currentCTC) < 0) {
    errors.push('Current CTC must be a valid number');
  }
  if (!String(city || '').trim()) errors.push('City is required');
  if (String(city || '').trim().toLowerCase() === 'other' && !String(customCity || '').trim()) {
    errors.push('Custom city is required when Other is selected');
  }
  if (!resolveCity(body) && String(city || '').trim()) {
    errors.push('Valid city is required');
  }
  return errors;
};

module.exports = {
  isValidEmail,
  isValidPhone,
  normalizePhone,
  validateContactFields,
  validateCandidateFields
};
