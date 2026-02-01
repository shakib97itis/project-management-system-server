const { ApiError } = require('../utils/apiError');

function validate(schema) {
  return (req, res, next) => {
    const parseResult = schema.safeParse({
      body: req.body,
      params: req.params,
      query: req.query,
    });

    if (!parseResult.success) {
      const message = parseResult.error.issues
        .map((issue) => issue.message)
        .join(', ');
      return next(new ApiError(400, message));
    }
    next();
  };
}

module.exports = { validate };
