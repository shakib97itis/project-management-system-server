const User = require('../models/User');
const {ApiError} = require('../utils/apiError');

async function listUsers(req, res, next) {
  try {
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(100, Math.max(1, Number(req.query.limit || 10)));
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      User.find()
        .select('-password')
        .sort({createdAt: -1})
        .skip(skip)
        .limit(limit),
      User.countDocuments(),
    ]);

    res.json({page, limit, total, items});
  } catch (e) {
    next(e);
  }
}

async function updateRole(req, res, next) {
  try {
    const {id} = req.params;
    const {role} = req.body;

    const user = await User.findById(id);
    if (!user) throw new ApiError(404, 'User not found');

    user.role = role;
    await user.save();

    res.json({
      message: 'Role updated',
      user: {id: user._id, email: user.email, role: user.role},
    });
  } catch (e) {
    next(e);
  }
}

async function updateStatus(req, res, next) {
  try {
    const {id} = req.params;
    const {status} = req.body;

    const user = await User.findById(id);
    if (!user) throw new ApiError(404, 'User not found');

    user.status = status;
    await user.save();

    res.json({
      message: 'Status updated',
      user: {id: user._id, email: user.email, status: user.status},
    });
  } catch (e) {
    next(e);
  }
}

async function deleteUser(req, res, next) {
  try {
    const {id} = req.params;

    const user = await User.findByIdAndDelete(id);
    if (!user) throw new ApiError(404, 'User not found');

    res.json({
      message: 'User deleted',
      user: {id: user._id, email: user.email, role: user.role},
    });
  } catch (e) {
    next(e);
  }
}

module.exports = {listUsers, updateRole, updateStatus, deleteUser};
