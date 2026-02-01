const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const User = require('../models/User');
const Invite = require('../models/Invite');
const { ApiError } = require('../utils/apiError');
const { signAccessToken } = require('../utils/tokens');

function buildAuthUser(user) {
  return { id: user._id, name: user.name, email: user.email, role: user.role };
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const normalizedEmail = email.toLowerCase();

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) throw new ApiError(401, 'Invalid credentials');
    if (user.status !== 'ACTIVE') throw new ApiError(403, 'User is inactive');

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) throw new ApiError(401, 'Invalid credentials');

    const token = signAccessToken({
      sub: user._id.toString(),
      role: user.role,
    });
    res.json({
      accessToken: token,
      user: buildAuthUser(user),
    });
  } catch (error) {
    next(error);
  }
}

async function invite(req, res, next) {
  try {
    const { email, role } = req.body;
    const normalizedEmail = email.toLowerCase();

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) throw new ApiError(409, 'User already exists');

    const existingInvite = await Invite.findOne({
      email: normalizedEmail,
      acceptedAt: null,
      expiresAt: { $gt: new Date() },
    });
    if (existingInvite) throw new ApiError(409, 'Active invite already exists');

    const tokenBytes = Number.parseInt(
      process.env.INVITE_TOKEN_BYTES || '32',
      10,
    );
    const token = crypto.randomBytes(tokenBytes).toString('hex');

    const expirationHours = Number.parseInt(
      process.env.INVITE_EXPIRES_HOURS || '48',
      10,
    );
    const expiresAt = new Date(
      Date.now() + expirationHours * 60 * 60 * 1000,
    );

    const invite = await Invite.create({
      email: normalizedEmail,
      role,
      token,
      expiresAt,
    });

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
  } catch (error) {
    next(error);
  }
}

async function registerViaInvite(req, res, next) {
  try {
    const { token, name, password } = req.body;

    const invite = await Invite.findOne({ token });
    if (!invite) throw new ApiError(400, 'Invalid invite token');
    if (invite.acceptedAt) throw new ApiError(400, 'Invite already used');
    const now = new Date();
    if (invite.expiresAt <= now)
      throw new ApiError(400, 'Invite expired');

    const existingUser = await User.findOne({ email: invite.email });
    if (existingUser) throw new ApiError(409, 'User already exists');

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await User.create({
      name,
      email: invite.email,
      password: hashedPassword,
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
      user: buildAuthUser(user),
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { login, invite, registerViaInvite };
