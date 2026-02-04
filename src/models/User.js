const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: {type: String, required: true, trim: true},
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {type: String, required: true}, // hashed
    role: {
      type: String,
      enum: ['ADMIN', 'MANAGER', 'STAFF'],
      default: 'STAFF',
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE'],
      default: 'ACTIVE',
    },
    invitedAt: {type: Date},
  },
  {timestamps: {createdAt: 'createdAt', updatedAt: 'updatedAt'}},
);

module.exports = mongoose.model('User', userSchema);
