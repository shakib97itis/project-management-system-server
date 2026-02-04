const mongoose = require('mongoose');

const refreshTokenSchema = new mongoose.Schema(
  {
    user: {type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true},
    tokenHash: {type: String, required: true, index: true},
    familyId: {type: String, required: true, index: true},
    expiresAt: {type: Date, required: true, index: true},
    revokedAt: {type: Date, default: null},
    replacedByHash: {type: String, default: null},
    userAgent: {type: String, default: null},
    ip: {type: String, default: null},
  },
  {timestamps: {createdAt: 'createdAt', updatedAt: 'updatedAt'}},
);

refreshTokenSchema.index({expiresAt: 1}, {expireAfterSeconds: 0});

module.exports = mongoose.model('RefreshToken', refreshTokenSchema);
