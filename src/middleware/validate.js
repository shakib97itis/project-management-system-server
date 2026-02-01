const {ApiError} = require('../utils/apiError');

function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse({
      body: req.body,
      params: req.params,
      query: req.query,
    });

    if (!result.success) {
      const msg = result.error.issues.map((i) => i.message).join(', ');
      return next(new ApiError(400, msg));
    }
    next();
  };
}

module.exports = {validate};
