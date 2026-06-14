const Candidate = require('../models/Candidate');
const CandidateComment = require('../models/CandidateComment');

const formatComment = (doc) => ({
  _id: doc._id,
  candidateId: doc.candidateId,
  comment: doc.comment,
  createdBy: doc.createdBy,
  adminId: doc.adminId,
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt
});

// GET /api/admin/candidate/:id/comments
const listCandidateComments = async (req, res) => {
  try {
    const candidate = await Candidate.findById(req.params.id).select('_id');
    if (!candidate) {
      return res.status(404).json({ message: 'Candidate not found' });
    }

    const comments = await CandidateComment.find({ candidateId: req.params.id })
      .sort({ createdAt: -1 })
      .lean();

    res.json({ data: comments.map(formatComment) });
  } catch (err) {
    console.error('listCandidateComments error:', err);
    res.status(500).json({ message: 'Failed to fetch comments' });
  }
};

// POST /api/admin/candidate/:id/comments
const createCandidateComment = async (req, res) => {
  try {
    const text = String(req.body.comment || '').trim();
    if (!text) {
      return res.status(400).json({ message: 'Comment is required' });
    }

    const candidate = await Candidate.findById(req.params.id).select('_id');
    if (!candidate) {
      return res.status(404).json({ message: 'Candidate not found' });
    }

    const createdBy = req.admin?.email || 'Admin';
    const doc = await CandidateComment.create({
      candidateId: req.params.id,
      comment: text,
      createdBy,
      adminId: req.admin?.id || null
    });

    res.status(201).json({ message: 'Comment added', comment: formatComment(doc) });
  } catch (err) {
    console.error('createCandidateComment error:', err);
    res.status(500).json({ message: 'Failed to add comment' });
  }
};

// DELETE /api/admin/candidate/comments/:commentId
const deleteCandidateComment = async (req, res) => {
  try {
    const comment = await CandidateComment.findByIdAndDelete(req.params.commentId);
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }
    res.json({ message: 'Comment deleted' });
  } catch (err) {
    console.error('deleteCandidateComment error:', err);
    res.status(500).json({ message: 'Failed to delete comment' });
  }
};

const deleteCommentsForCandidate = async (candidateId) => {
  await CandidateComment.deleteMany({ candidateId });
};

module.exports = {
  listCandidateComments,
  createCandidateComment,
  deleteCandidateComment,
  deleteCommentsForCandidate
};
