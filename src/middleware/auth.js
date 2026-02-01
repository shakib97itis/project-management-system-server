const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { ApiError } = require('../utils/apiError');

async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization || '';
    const [scheme, token] = authHeader.split(' ');

    if (scheme !== 'Bearer' || !token) {
      throw new ApiError(401, 'Missing auth token');
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.sub);

    if (!user) throw new ApiError(401, 'User not found');
    if (user.status !== 'ACTIVE') throw new ApiError(403, 'User is inactive');

    req.user = user;
    next();
  } catch (error) {
    if (error instanceof ApiError) {
      return next(error);
    }
    return next(new ApiError(401, 'Invalid/expired token'));
  }
}

module.exports = { requireAuth };
