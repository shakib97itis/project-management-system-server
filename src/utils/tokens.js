const jwt = require('jsonwebtoken');
const {
  ACCESS_TOKEN_SECRET,
  REFRESH_TOKEN_SECRET,
  ACCESS_TOKEN_TTL,
  REFRESH_TOKEN_TTL,
  buildJwtOptions,
} = require('../config/auth');

function signAccessToken(payload) {
  return jwt.sign(
    {...payload, type: 'access'},
    ACCESS_TOKEN_SECRET,
    buildJwtOptions(ACCESS_TOKEN_TTL),
  );
}

function signRefreshToken(payload) {
  return jwt.sign(
    {...payload, type: 'refresh'},
    REFRESH_TOKEN_SECRET,
    buildJwtOptions(REFRESH_TOKEN_TTL),
  );
}

const generateTokens = ({sub, role, jti, familyId}) => {
  const accessToken = signAccessToken({sub, role});
  const refreshToken = signRefreshToken({sub, role, jti, fid: familyId});
  return {accessToken, refreshToken};
};

module.exports = {signAccessToken, signRefreshToken, generateTokens};
