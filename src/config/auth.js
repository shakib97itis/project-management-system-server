const parseDurationToMs = (value) => {
  if (!value || typeof value !== 'string') return undefined;
  const match = value.trim().match(/^(\d+)(ms|s|m|h|d)$/i);
  if (!match) return undefined;
  const amount = Number.parseInt(match[1], 10);
  const unit = match[2].toLowerCase();
  const multipliers = {
    ms: 1,
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };
  return amount * multipliers[unit];
};

const ACCESS_TOKEN_SECRET =
  process.env.ACCESS_TOKEN_SECRET || 'dev_access_secret';

const REFRESH_TOKEN_SECRET =
  process.env.REFRESH_TOKEN_SECRET || 'dev_refresh_secret';

const ACCESS_TOKEN_TTL = process.env.ACCESS_TOKEN_TTL || '15m';
const REFRESH_TOKEN_TTL = process.env.REFRESH_TOKEN_TTL || '7d';

const JWT_ISSUER = process.env.JWT_ISSUER;
const JWT_AUDIENCE = process.env.JWT_AUDIENCE;

const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN || undefined;
const COOKIE_SAMESITE = process.env.COOKIE_SAMESITE || 'Strict';

const buildJwtOptions = (expiresIn) => {
  const options = {expiresIn};
  if (JWT_ISSUER) options.issuer = JWT_ISSUER;
  if (JWT_AUDIENCE) options.audience = JWT_AUDIENCE;
  return options;
};

const buildCookieOptions = () => {
  const maxAge = parseDurationToMs(REFRESH_TOKEN_TTL);
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: COOKIE_SAMESITE,
    domain: COOKIE_DOMAIN,
    maxAge: maxAge || 7 * 24 * 60 * 60 * 1000,
  };
};

module.exports = {
  ACCESS_TOKEN_SECRET,
  REFRESH_TOKEN_SECRET,
  ACCESS_TOKEN_TTL,
  REFRESH_TOKEN_TTL,
  JWT_ISSUER,
  JWT_AUDIENCE,
  buildJwtOptions,
  buildCookieOptions,
};
