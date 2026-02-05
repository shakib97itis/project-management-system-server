const jwt = require('jsonwebtoken');
const User = require('../models/User');
const {ApiError} = require('../utils/apiError');
const {
  ACCESS_TOKEN_SECRET,
  JWT_ISSUER,
  JWT_AUDIENCE,
} = require('../config/auth');

async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization || '';
    const [scheme, token] = authHeader.split(' ');

    if (scheme !== 'Bearer' || !token) {
      throw new ApiError(401, 'Missing auth token');
    }

    const verifyOptions = {};
    if (JWT_ISSUER) verifyOptions.issuer = JWT_ISSUER;
    if (JWT_AUDIENCE) verifyOptions.audience = JWT_AUDIENCE;

    const payload = jwt.verify(token, ACCESS_TOKEN_SECRET, verifyOptions);
    if (payload.type && payload.type !== 'access') {
      throw new ApiError(401, 'Invalid token type');
    }
    const user = await User.findById(payload.sub).select('-password');

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
