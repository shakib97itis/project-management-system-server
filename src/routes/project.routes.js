const router = require('express').Router();
const { z } = require('zod');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { validate } = require('../middleware/validate');
const projectController = require('../controllers/project.controller');

router.use(requireAuth);

router.post(
  '/',
  validate(
    z.object({
      body: z.object({
        name: z.string().min(2),
        description: z.string().optional(),
      }),
    }),
  ),
  projectController.createProject,
);

router.get('/', projectController.listProjects);

router.patch(
  '/:id',
  requireRole('ADMIN'),
  validate(
    z.object({
      params: z.object({ id: z.string().min(5) }),
      body: z.object({
        name: z.string().min(2).optional(),
        description: z.string().optional(),
        status: z.enum(['ACTIVE', 'ARCHIVED']).optional(),
      }),
    }),
  ),
  projectController.updateProject,
);

router.delete(
  '/:id',
  requireRole('ADMIN'),
  validate(z.object({ params: z.object({ id: z.string().min(5) }) })),
  projectController.softDeleteProject,
);

module.exports = router;
