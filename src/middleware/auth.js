const jwt = require('jsonwebtoken');
const User = require('../models/User');
const {ApiError} = require('../utils/apiError');

async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const [type, token] = header.split(' ');

    if (type !== 'Bearer' || !token)
      throw new ApiError(401, 'Missing auth token');

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.sub);

    if (!user) throw new ApiError(401, 'User not found');
    if (user.status !== 'ACTIVE') throw new ApiError(403, 'User is inactive');

    req.user = user; // attach
    next();
  } catch (e) {
    next(e.statusCode ? e : new ApiError(401, 'Invalid/expired token'));
  }
}

module.exports = {requireAuth};
