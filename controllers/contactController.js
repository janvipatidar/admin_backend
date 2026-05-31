const ContactMessage = require('../models/ContactMessage');
const { validateContactFields } = require('../utils/validators');

// POST /api/contact
const createContactMessage = async (req, res) => {
  try {
    const body = req.body || {};

    const fieldErrors = validateContactFields(body);
    if (fieldErrors.length) {
      return res.status(400).json({ message: fieldErrors.join('. ') });
    }

    const msg = await ContactMessage.create({
      name: body.name,
      email: body.email,
      phone: body.phone,
      message: body.message
    });

    return res.status(201).json({
      message: 'Message received',
      contactMessage: msg
    });
  } catch (err) {
    console.error('createContactMessage error:', err);
    return res.status(500).json({ message: 'Failed to save contact message' });
  }
};

// GET /api/admin/contacts
const listContactMessages = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      ContactMessage.find().sort({ createdAt: -1 }).skip(skip).limit(limit),
      ContactMessage.countDocuments()
    ]);

    return res.json({
      data: items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1
      }
    });
  } catch (err) {
    console.error('listContactMessages error:', err);
    return res.status(500).json({ message: 'Failed to fetch contact messages' });
  }
};

// DELETE /api/admin/contacts/:id
const deleteContactMessage = async (req, res) => {
  try {
    const msg = await ContactMessage.findByIdAndDelete(req.params.id);
    if (!msg) {
      return res.status(404).json({ message: 'Message not found' });
    }
    return res.json({ message: 'Message deleted' });
  } catch (err) {
    console.error('deleteContactMessage error:', err);
    return res.status(500).json({ message: 'Failed to delete message' });
  }
};

module.exports = {
  createContactMessage,
  listContactMessages,
  deleteContactMessage
};

