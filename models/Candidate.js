// Candidate model — captures everything we need for placement workflows
const mongoose = require('mongoose');

const ALLOWED_STATUSES = [
  'Applied',
  'Shortlisted',
  'Interview',
  'Selected',
  'Rejected',
  'On Hold'
];

const candidateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    index: true
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  dateOfBirth: {
    type: Date
  },
  education: {
    type: String,
    trim: true
  },
  experience: {
    // Years of experience as a number for easier filtering / sorting
    type: Number,
    default: 0,
    min: 0
  },
  noticePeriod: {
    // Stored as a free-form string e.g. "Immediate", "30 days", "60 days"
    type: String,
    trim: true
  },
  currentEmployer: {
    type: String,
    trim: true
  },
  previousEmployer: {
    type: String,
    trim: true
  },
  keySkills: {
    type: [String],
    default: []
  },
  designation: {
    type: String,
    trim: true,
    default: ''
  },
  currentCTC: {
    type: Number,
    default: 0,
    min: 0
  },
  department: {
    type: String,
    trim: true,
    default: ''
  },
  currentIndustry: {
    type: String,
    trim: true
  },
  gender: {
    type: String,
    trim: true,
    default: ''
  },
  ugQualification: {
    type: String,
    trim: true,
    default: ''
  },
  pgQualification: {
    type: String,
    trim: true,
    default: ''
  },
  isActive: {
    type: Boolean,
    default: true
  },
  state: {
    type: String,
    trim: true
  },
  city: {
    type: String,
    trim: true
  },
  location: {
    type: String,
    trim: true
  },
  expectedSalary: {
    // Stored as a number (LPA, INR, USD - app-level convention)
    type: Number,
    default: 0
  },
  resumeUrl: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ALLOWED_STATUSES,
    default: 'Applied'
  },
  notes: {
    type: String,
    default: ''
  },
  // Row id from Google Sheets - allows updates to find the same row
  sheetRowId: {
    type: String,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Keep updatedAt in sync on save
candidateSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

candidateSchema.statics.ALLOWED_STATUSES = ALLOWED_STATUSES;

candidateSchema.index({ designation: 1 });
candidateSchema.index({ currentCTC: 1 });
candidateSchema.index({ isActive: 1 });
candidateSchema.index({ createdAt: -1 });
candidateSchema.index({ keySkills: 1 });

module.exports = mongoose.model('Candidate', candidateSchema);
