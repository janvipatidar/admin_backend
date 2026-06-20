/** Store CTC as a display string (e.g. "4 LPA", "4.5L", "400000") */
const normalizeCurrentCTC = (value) => String(value ?? '').trim();

const isValidCurrentCTC = (value) => normalizeCurrentCTC(value).length > 0;

/** Parse numeric LPA from common string formats for range filters */
const parseCTCToNumber = (value) => {
  const raw = normalizeCurrentCTC(value);
  if (!raw) return null;

  const lower = raw.toLowerCase().replace(/,/g, '');
  const lpaMatch = lower.match(/(\d+(?:\.\d+)?)\s*(?:lpa|lacs?|lac|l)\b/);
  if (lpaMatch) return Number(lpaMatch[1]);

  const kMatch = lower.match(/(\d+(?:\.\d+)?)\s*k\b/);
  if (kMatch) return Number(kMatch[1]) * 0.1;

  const plain = Number(lower.replace(/[^\d.]/g, ''));
  if (!Number.isNaN(plain) && plain > 0) {
    if (plain >= 100000) return plain / 100000;
    if (plain >= 10000) return plain / 100000;
    return plain;
  }
  return null;
};

module.exports = {
  normalizeCurrentCTC,
  isValidCurrentCTC,
  parseCTCToNumber
};
