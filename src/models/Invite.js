const mongoose = require('mongoose');

const inviteSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, lowercase: true, trim: true },
    role: {
      type: String,
      enum: ['ADMIN', 'MANAGER', 'STAFF'],
      default: 'STAFF',
    },
    token: { type: String, required: true, unique: true, index: true },
    expiresAt: { type: Date, required: true },
    acceptedAt: { type: Date },
  },
  { timestamps: true },
);

inviteSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
// Optional: auto cleanup after expiry (still validate expiry in code)

module.exports = mongoose.model('Invite', inviteSchema);
