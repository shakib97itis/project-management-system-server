const router = require('express').Router();
const {z} = require('zod');
const rateLimit = require('express-rate-limit');
const {validate} = require('../middleware/validate');
const {requireAuth} = require('../middleware/auth');
const {requireRole} = require('../middleware/rbac');
const authController = require('../controllers/auth.controller');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});

const refreshLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});

const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});

router.post(
  '/login',
  loginLimiter,
  validate(
    z.object({
      body: z.object({
        email: z.string().email(),
        password: z.string().min(6),
      }),
    }),
  ),
  authController.login,
);

router.post(
  '/invite',
  requireAuth,
  requireRole('ADMIN'),
  validate(
    z.object({
      body: z.object({
        email: z.string().email(),
        role: z.enum(['ADMIN', 'MANAGER', 'STAFF']),
      }),
    }),
  ),
  authController.invite,
);

router.post(
  '/register-via-invite',
  registerLimiter,
  validate(
    z.object({
      body: z.object({
        token: z.string().min(10),
        name: z.string().min(2),
        password: z.string().min(6),
      }),
    }),
  ),
  authController.registerViaInvite,
);

router.get('/me', requireAuth, authController.me);

router.post('/refresh', refreshLimiter, authController.handleRefreshToken);

// Logout: clears refresh token cookie and server-side token (if present)
router.post('/logout', authController.logout);

module.exports = router;
