const router = require('express').Router();
const { z } = require('zod');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { validate } = require('../middleware/validate');
const userController = require('../controllers/user.controller');

router.use(requireAuth, requireRole('ADMIN'));

router.get(
  '/',
  validate(
    z.object({
      query: z.object({
        page: z.string().optional(),
        limit: z.string().optional(),
      }),
    }),
  ),
  userController.listUsers,
);

router.patch(
  '/:id/role',
  validate(
    z.object({
      params: z.object({ id: z.string().min(5) }),
      body: z.object({ role: z.enum(['ADMIN', 'MANAGER', 'STAFF']) }),
    }),
  ),
  userController.updateRole,
);

router.patch(
  '/:id/status',
  validate(
    z.object({
      params: z.object({ id: z.string().min(5) }),
      body: z.object({ status: z.enum(['ACTIVE', 'INACTIVE']) }),
    }),
  ),
  userController.updateStatus,
);

router.delete(
  '/:id',
  validate(z.object({ params: z.object({ id: z.string().min(5) }) })),
  userController.deleteUser,
);

module.exports = router;
