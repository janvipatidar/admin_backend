// Google Sheets integration helpers
//
// This module is intentionally defensive: if Google Sheets credentials are not
// configured, the per-candidate sync helpers no-op so the rest of the app
// keeps working. The export-to-Google-Sheet helper does require credentials
// (Sheets API + Drive API) - see README for setup.
//
// Required env vars (when using these helpers):
//   - GOOGLE_SERVICE_ACCOUNT_JSON full service-account JSON, single line
//   - GOOGLE_SHEETS_ID            (optional) for the per-candidate sync flow
//
// The first row of the sheet is treated as a header. We append rows below it
// and look up rows by candidate `_id` (kept in column A) to update them.

const { google } = require('googleapis');

// Both Sheets and Drive scopes - Drive is needed to create a sheet and to
// share it with "anyone with the link".
const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive'
];

const SHEET_NAME = 'Candidates';
const HEADER = [
  'CandidateId',
  'Name',
  'Email',
  'Phone',
  'Education',
  'Experience',
  'NoticePeriod',
  'CurrentEmployer',
  'PreviousEmployer',
  'Industry',
  'Location',
  'ExpectedSalary',
  'KeySkills',
  'ResumeUrl',
  'Status',
  'Notes',
  'CreatedAt'
];

let cachedClient = null;

const isEnabled = () =>
  String(process.env.GOOGLE_SHEETS_ENABLED || '').toLowerCase() === 'true' &&
  !!process.env.GOOGLE_SHEETS_ID &&
  !!process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

const getSheetsClient = async () => {
  if (cachedClient) return cachedClient;

  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });
  const authClient = await auth.getClient();
  cachedClient = google.sheets({ version: 'v4', auth: authClient });
  return cachedClient;
};

const candidateToRow = (c) => [
  String(c._id || ''),
  c.name || '',
  c.email || '',
  c.phone || '',
  c.education || '',
  c.experience != null ? String(c.experience) : '',
  c.noticePeriod || '',
  c.currentEmployer || '',
  c.previousEmployer || '',
  c.currentIndustry || '',
  c.location || '',
  c.expectedSalary != null ? String(c.expectedSalary) : '',
  Array.isArray(c.keySkills) ? c.keySkills.join(', ') : '',
  c.resumeUrl || '',
  c.status || '',
  c.notes || '',
  (c.createdAt ? new Date(c.createdAt) : new Date()).toISOString()
];

// Make sure the header row exists. Safe to call repeatedly.
const ensureHeader = async (sheets) => {
  const range = `${SHEET_NAME}!A1:Q1`;
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEETS_ID,
    range
  });
  const values = res.data.values;
  if (!values || !values.length) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: process.env.GOOGLE_SHEETS_ID,
      range,
      valueInputOption: 'RAW',
      requestBody: { values: [HEADER] }
    });
  }
};

// Locate the row index (1-based) of a candidate by its id in column A.
const findRowIndexById = async (sheets, candidateId) => {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEETS_ID,
    range: `${SHEET_NAME}!A:A`
  });
  const rows = res.data.values || [];
  for (let i = 0; i < rows.length; i += 1) {
    if (rows[i][0] === String(candidateId)) {
      return i + 1; // sheet rows are 1-based
    }
  }
  return -1;
};

const addCandidateToSheet = async (candidate) => {
  if (!isEnabled()) return;
  try {
    const sheets = await getSheetsClient();
    await ensureHeader(sheets);
    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.GOOGLE_SHEETS_ID,
      range: `${SHEET_NAME}!A:Q`,
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: [candidateToRow(candidate)] }
    });
  } catch (err) {
    // Log but don't throw - sheet sync should never block API responses
    console.error('addCandidateToSheet error:', err.message);
  }
};

const updateCandidateInSheet = async (candidate) => {
  if (!isEnabled()) return;
  try {
    const sheets = await getSheetsClient();
    await ensureHeader(sheets);
    const rowIndex = await findRowIndexById(sheets, candidate._id);
    if (rowIndex === -1) {
      // Not found - append it instead so the sheet stays in sync.
      await addCandidateToSheet(candidate);
      return;
    }
    await sheets.spreadsheets.values.update({
      spreadsheetId: process.env.GOOGLE_SHEETS_ID,
      range: `${SHEET_NAME}!A${rowIndex}:Q${rowIndex}`,
      valueInputOption: 'RAW',
      requestBody: { values: [candidateToRow(candidate)] }
    });
  } catch (err) {
    console.error('updateCandidateInSheet error:', err.message);
  }
};

module.exports = {
  addCandidateToSheet,
  updateCandidateInSheet,
  isEnabled
};
