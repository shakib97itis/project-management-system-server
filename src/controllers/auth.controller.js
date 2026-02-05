const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Invite = require('../models/Invite');
const RefreshToken = require('../models/RefreshToken');
const {ApiError} = require('../utils/apiError');
const {generateTokens} = require('../utils/tokens');
const {
  REFRESH_TOKEN_SECRET,
  JWT_ISSUER,
  JWT_AUDIENCE,
  buildCookieOptions,
} = require('../config/auth');

function buildAuthUser(user) {
  return {
    id: user?._id?.toString?.() ?? String(user?._id),
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
  };
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function generateId() {
  return crypto.randomUUID
    ? crypto.randomUUID()
    : crypto.randomBytes(16).toString('hex');
}

function setRefreshCookie(res, refreshToken) {
  res.cookie('refreshToken', refreshToken, buildCookieOptions());
}

function clearRefreshCookie(res) {
  res.clearCookie('refreshToken', {...buildCookieOptions(), maxAge: 0});
}

async function storeRefreshToken({
  userId,
  refreshToken,
  familyId,
  userAgent,
  ip,
}) {
  const decoded = jwt.decode(refreshToken);
  const expiresAt = decoded?.exp ? new Date(decoded.exp * 1000) : null;
  if (!expiresAt) {
    throw new ApiError(500, 'Failed to determine refresh token expiry');
  }
  const tokenHash = hashToken(refreshToken);
  await RefreshToken.create({
    user: userId,
    tokenHash,
    familyId,
    expiresAt,
    userAgent,
    ip,
  });
  return tokenHash;
}

async function login(req, res, next) {
  try {
    const {email, password} = req.body;
    const normalizedEmail = email.toLowerCase();

    const user = await User.findOne({email: normalizedEmail});
    if (!user) throw new ApiError(401, 'Invalid credentials');
    if (user.status !== 'ACTIVE') throw new ApiError(403, 'User is inactive');

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) throw new ApiError(401, 'Invalid credentials');

    const familyId = generateId();
    const jti = generateId();
    const {accessToken, refreshToken} = generateTokens({
      sub: user._id.toString(),
      role: user.role,
      jti,
      familyId,
    });

    await storeRefreshToken({
      userId: user._id,
      refreshToken,
      familyId,
      userAgent: req.get('user-agent') || null,
      ip: req.ip,
    });

    setRefreshCookie(res, refreshToken);

    res.json({
      accessToken,
      user: buildAuthUser(user),
    });
  } catch (error) {
    next(error);
  }
}

async function me(req, res, next) {
  try {
    res.json({user: buildAuthUser(req.user)});
  } catch (error) {
    next(error);
  }
}

const handleRefreshToken = async (req, res, next) => {
  try {
    const cookies = req.cookies;
    if (!cookies?.refreshToken) {
      return res.status(401).json({message: 'No refresh token'});
    }

    const refreshToken = cookies.refreshToken;
    let decoded;
    try {
      const verifyOptions = {};
      if (JWT_ISSUER) verifyOptions.issuer = JWT_ISSUER;
      if (JWT_AUDIENCE) verifyOptions.audience = JWT_AUDIENCE;
      decoded = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET, verifyOptions);
    } catch (error) {
      clearRefreshCookie(res);
      return next(new ApiError(403, 'Invalid refresh token'));
    }

    if (decoded.type && decoded.type !== 'refresh') {
      clearRefreshCookie(res);
      return next(new ApiError(403, 'Invalid refresh token type'));
    }

    const tokenHash = hashToken(refreshToken);
    const session = await RefreshToken.findOne({tokenHash});
    const now = new Date();

    if (!session || session.revokedAt || session.expiresAt <= now) {
      if (decoded.fid) {
        await RefreshToken.updateMany(
          {familyId: decoded.fid, revokedAt: null},
          {revokedAt: now},
        );
      }
      clearRefreshCookie(res);
      return next(new ApiError(403, 'Invalid refresh token'));
    }

    if (session.user.toString() !== decoded.sub) {
      await RefreshToken.updateMany(
        {familyId: session.familyId, revokedAt: null},
        {revokedAt: now},
      );
      clearRefreshCookie(res);
      return next(new ApiError(403, 'Invalid refresh token'));
    }

    const user = await User.findById(session.user).select('-password');
    if (!user) {
      await RefreshToken.updateMany(
        {familyId: session.familyId, revokedAt: null},
        {revokedAt: now},
      );
      clearRefreshCookie(res);
      return next(new ApiError(403, 'Invalid refresh token'));
    }

    if (user.status !== 'ACTIVE') {
      await RefreshToken.updateMany(
        {familyId: session.familyId, revokedAt: null},
        {revokedAt: now},
      );
      clearRefreshCookie(res);
      return next(new ApiError(403, 'User is inactive'));
    }

    const familyId = session.familyId;
    const jti = generateId();
    const {accessToken, refreshToken: newRefreshToken} = generateTokens({
      sub: user._id.toString(),
      role: user.role,
      jti,
      familyId,
    });

    const newTokenHash = hashToken(newRefreshToken);
    session.revokedAt = now;
    session.replacedByHash = newTokenHash;
    await session.save();

    await storeRefreshToken({
      userId: user._id,
      refreshToken: newRefreshToken,
      familyId,
      userAgent: req.get('user-agent') || null,
      ip: req.ip,
    });

    setRefreshCookie(res, newRefreshToken);
    res.json({accessToken, user: buildAuthUser(user)});
  } catch (error) {
    next(error);
  }
};

async function invite(req, res, next) {
  try {
    const {email, role} = req.body;
    const normalizedEmail = email.toLowerCase();

    const existingUser = await User.findOne({email: normalizedEmail});
    if (existingUser) throw new ApiError(409, 'User already exists');

    const existingInvite = await Invite.findOne({
      email: normalizedEmail,
      acceptedAt: null,
      expiresAt: {$gt: new Date()},
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
    const expiresAt = new Date(Date.now() + expirationHours * 60 * 60 * 1000);

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
    const {token, name, password} = req.body;

    const invite = await Invite.findOne({token});
    if (!invite) throw new ApiError(400, 'Invalid invite token');
    if (invite.acceptedAt) throw new ApiError(400, 'Invite already used');
    const now = new Date();
    if (invite.expiresAt <= now) throw new ApiError(400, 'Invite expired');

    const existingUser = await User.findOne({email: invite.email});
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

    const familyId = generateId();
    const jti = generateId();
    const {accessToken, refreshToken} = generateTokens({
      sub: user._id.toString(),
      role: user.role,
      jti,
      familyId,
    });

    await storeRefreshToken({
      userId: user._id,
      refreshToken,
      familyId,
      userAgent: req.get('user-agent') || null,
      ip: req.ip,
    });

    setRefreshCookie(res, refreshToken);

    res.status(201).json({
      message: 'Registration complete',
      accessToken,
      user: buildAuthUser(user),
    });
  } catch (error) {
    next(error);
  }
}

async function logout(req, res, next) {
  try {
    const cookies = req.cookies;
    if (!cookies?.refreshToken) {
      clearRefreshCookie(res);
      return res.sendStatus(204);
    }

    const refreshToken = cookies.refreshToken;
    const tokenHash = hashToken(refreshToken);
    const session = await RefreshToken.findOne({tokenHash});
    if (session && !session.revokedAt) {
      session.revokedAt = new Date();
      await session.save();
    }

    clearRefreshCookie(res);
    return res.sendStatus(204);
  } catch (error) {
    next(error);
  }
}

module.exports = {login, invite, registerViaInvite, me, handleRefreshToken, logout};
