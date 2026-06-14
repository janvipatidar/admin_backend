const EDUCATION_OPTIONS = ['10th', '12th', 'Graduation', 'Post Graduation'];

const NOTICE_PERIOD_OPTIONS = [
  'Immediate',
  '15 Days',
  '30 Days',
  '45 Days',
  '60 Days',
  '90 Days',
  'More than 90 Days'
];

const INDUSTRY_OPTIONS = [
  'Sales/Marketing',
  'Banking/Finance',
  'Life Insurance',
  'Health Insurance',
  'General Insurance',
  'FMCG',
  'Admin',
  'Operation',
  'HR',
  'Other'
];

const isAllowedOption = (value, options) => {
  const v = String(value || '').trim();
  if (!v) return false;
  return options.some((opt) => opt.toLowerCase() === v.toLowerCase());
};

const validateEducation = (education, { required = false } = {}) => {
  const v = String(education || '').trim();
  if (!v) return required ? 'Education is required' : null;
  if (!isAllowedOption(v, EDUCATION_OPTIONS)) {
    return `Education must be one of: ${EDUCATION_OPTIONS.join(', ')}`;
  }
  return null;
};

const validateNoticePeriod = (noticePeriod) => {
  const v = String(noticePeriod || '').trim();
  if (!v) return null;
  if (!isAllowedOption(v, NOTICE_PERIOD_OPTIONS)) {
    return `Notice period must be one of: ${NOTICE_PERIOD_OPTIONS.join(', ')}`;
  }
  return null;
};

const validateIndustry = (industry) => {
  const v = String(industry || '').trim();
  if (!v) return null;
  if (!isAllowedOption(v, INDUSTRY_OPTIONS)) {
    return `Industry must be one of: ${INDUSTRY_OPTIONS.join(', ')}`;
  }
  return null;
};

module.exports = {
  EDUCATION_OPTIONS,
  NOTICE_PERIOD_OPTIONS,
  INDUSTRY_OPTIONS,
  isAllowedOption,
  validateEducation,
  validateNoticePeriod,
  validateIndustry
};
