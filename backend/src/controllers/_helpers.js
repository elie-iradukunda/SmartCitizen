export const asyncHandler = (handler) => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch(next);
};

export const validateRequired = (payload, fields) => {
  const missing = fields.filter((field) => !payload[field]);
  if (missing.length) {
    const error = new Error(`${missing.join(', ')} ${missing.length === 1 ? 'is' : 'are'} required`);
    error.status = 422;
    throw error;
  }
};

