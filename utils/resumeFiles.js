const fs = require('fs');
const path = require('path');

const deleteResumeFile = (resumeUrl) => {
  if (!resumeUrl || /^https?:\/\//i.test(resumeUrl)) return;

  const relative = resumeUrl.replace(/^\/uploads\//, '');
  const filePath = path.join(process.cwd(), 'uploads', relative);

  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (err) {
    console.warn('Failed to delete resume file:', filePath, err.message);
  }
};

module.exports = { deleteResumeFile };
