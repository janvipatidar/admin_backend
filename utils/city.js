const resolveCity = (body = {}) => {
  const city = String(body.city || '').trim();
  if (city.toLowerCase() === 'other') {
    return String(body.customCity || '').trim();
  }
  return city;
};

module.exports = { resolveCity };
