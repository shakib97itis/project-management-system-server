const User = require('../models/User');
const { ApiError } = require('../utils/apiError');

function buildUserResponse(user, fields) {
  return fields.reduce((response, field) => {
    response[field] = user[field];
    return response;
  }, { id: user._id });
}

async function countActiveAdmins() {
  return User.countDocuments({ role: 'ADMIN', status: 'ACTIVE' });
}

async function listUsers(req, res, next) {
  try {
    const pageNumber = Math.max(1, Number(req.query.page || 1));
    const pageSize = Math.min(100, Math.max(1, Number(req.query.limit || 10)));
    const skip = (pageNumber - 1) * pageSize;

    const [users, total] = await Promise.all([
      User.find()
        .select('-password')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageSize),
      User.countDocuments(),
    ]);

    res.json({ page: pageNumber, limit: pageSize, total, items: users });
  } catch (error) {
    next(error);
  }
}

async function updateRole(req, res, next) {
  try {
    const { id: userId } = req.params;
    const { role } = req.body;

    const user = await User.findById(userId);
    if (!user) throw new ApiError(404, 'User not found');

    if (
      user.role === 'ADMIN' &&
      role !== 'ADMIN' &&
      user.status === 'ACTIVE'
    ) {
      const activeAdmins = await countActiveAdmins();
      if (activeAdmins <= 1) {
        throw new ApiError(409, 'Cannot remove the last active admin');
      }
    }

    user.role = role;
    await user.save();

    res.json({
      message: 'Role updated',
      user: buildUserResponse(user, ['email', 'role']),
    });
  } catch (error) {
    next(error);
  }
}

async function updateStatus(req, res, next) {
  try {
    const { id: userId } = req.params;
    const { status } = req.body;

    const user = await User.findById(userId);
    if (!user) throw new ApiError(404, 'User not found');

    if (
      user.role === 'ADMIN' &&
      user.status === 'ACTIVE' &&
      status === 'INACTIVE'
    ) {
      const activeAdmins = await countActiveAdmins();
      if (activeAdmins <= 1) {
        throw new ApiError(409, 'Cannot deactivate the last active admin');
      }
    }

    user.status = status;
    await user.save();

    res.json({
      message: 'Status updated',
      user: buildUserResponse(user, ['email', 'status']),
    });
  } catch (error) {
    next(error);
  }
}

async function deleteUser(req, res, next) {
  try {
    const { id: userId } = req.params;

    const user = await User.findById(userId);
    if (!user) throw new ApiError(404, 'User not found');

    if (user.role === 'ADMIN' && user.status === 'ACTIVE') {
      const activeAdmins = await countActiveAdmins();
      if (activeAdmins <= 1) {
        throw new ApiError(409, 'Cannot delete the last active admin');
      }
    }

    await user.deleteOne();

    res.json({
      message: 'User deleted',
      user: buildUserResponse(user, ['email', 'role']),
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { listUsers, updateRole, updateStatus, deleteUser };
