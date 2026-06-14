const mongoose = require('mongoose');

const candidateCommentSchema = new mongoose.Schema(
  {
    candidateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Candidate',
      required: true,
      index: true
    },
    comment: {
      type: String,
      required: true,
      trim: true,
      maxlength: 5000
    },
    createdBy: {
      type: String,
      required: true,
      trim: true
    },
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      default: null
    }
  },
  { timestamps: true }
);

candidateCommentSchema.index({ candidateId: 1, createdAt: -1 });

module.exports = mongoose.model('CandidateComment', candidateCommentSchema);
