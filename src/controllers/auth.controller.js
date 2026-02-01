const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const User = require('../models/User');
const Invite = require('../models/Invite');
const {ApiError} = require('../utils/apiError');
const {signAccessToken} = require('../utils/tokens');

async function login(req, res, next) {
  try {
    const {email, password} = req.body;

    const user = await User.findOne({email: email.toLowerCase()});
    if (!user) throw new ApiError(401, 'Invalid credentials');
    if (user.status !== 'ACTIVE') throw new ApiError(403, 'User is inactive');

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) throw new ApiError(401, 'Invalid credentials');

    const token = signAccessToken({sub: user._id.toString(), role: user.role});
    res.json({
      accessToken: token,
      user: {id: user._id, name: user.name, email: user.email, role: user.role},
    });
  } catch (e) {
    next(e);
  }
}

async function invite(req, res, next) {
  try {
    const {email, role} = req.body;
    const lower = email.toLowerCase();

    const existingUser = await User.findOne({email: lower});
    if (existingUser) throw new ApiError(409, 'User already exists');

    const existingInvite = await Invite.findOne({
      email: lower,
      acceptedAt: null,
      expiresAt: {$gt: new Date()},
    });
    if (existingInvite) throw new ApiError(409, 'Active invite already exists');

    const bytes = Number(process.env.INVITE_TOKEN_BYTES || 32);
    const token = crypto.randomBytes(bytes).toString('hex');

    const hours = Number(process.env.INVITE_EXPIRES_HOURS || 48);
    const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);

    const invite = await Invite.create({email: lower, role, token, expiresAt});

    // Email simulation: return the token/link in response
    res.status(201).json({
      message: 'Invite created',
      invite: {
        id: invite._id,
        email: invite.email,
        role: invite.role,
        token: invite.token,
        expiresAt: invite.expiresAt,
      },
      inviteLink: `/register?token=${invite.token}`,
    });
  } catch (e) {
    next(e);
  }
}

async function registerViaInvite(req, res, next) {
  try {
    const {token, name, password} = req.body;

    const invite = await Invite.findOne({token});
    if (!invite) throw new ApiError(400, 'Invalid invite token');
    if (invite.acceptedAt) throw new ApiError(400, 'Invite already used');
    if (invite.expiresAt <= new Date())
      throw new ApiError(400, 'Invite expired');

    const existingUser = await User.findOne({email: invite.email});
    if (existingUser) throw new ApiError(409, 'User already exists');

    const hashed = await bcrypt.hash(password, 12);

    const user = await User.create({
      name,
      email: invite.email,
      password: hashed,
      role: invite.role,
      status: 'ACTIVE',
      invitedAt: new Date(),
    });

    invite.acceptedAt = new Date();
    await invite.save();

    const accessToken = signAccessToken({
      sub: user._id.toString(),
      role: user.role,
    });
    res.status(201).json({
      message: 'Registration complete',
      accessToken,
      user: {id: user._id, name: user.name, email: user.email, role: user.role},
    });
  } catch (e) {
    next(e);
  }
}

module.exports = {login, invite, registerViaInvite};
