const ContactMessage = require('../models/ContactMessage');

// POST /api/contact
const createContactMessage = async (req, res) => {
  try {
    const body = req.body || {};

    if (!body.name || !body.email || !body.phone || !body.message) {
      return res.status(400).json({
        message: 'Name, email, phone and message are required'
      });
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

module.exports = { createContactMessage };

