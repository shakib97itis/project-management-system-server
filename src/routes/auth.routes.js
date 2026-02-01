const router = require('express').Router();
const { z } = require('zod');
const { validate } = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const authController = require('../controllers/auth.controller');

router.post(
  '/login',
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

module.exports = router;
