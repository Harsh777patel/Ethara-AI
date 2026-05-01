const express = require('express');
const router = express.Router();
const {
  projectValidation,
  createProject,
  getProjects,
  getProject,
  updateProject,
  deleteProject,
  addMember,
  removeMember,
  updateMemberRole,
} = require('../controllers/projectController');
const { protect } = require('../middleware/auth');
const { projectAccess } = require('../middleware/projectAccess');
const validate = require('../middleware/validate');

// Base CRUD
router.get('/', protect, getProjects);
router.post('/', protect, ...projectValidation, validate, createProject);

// Project-specific routes (require membership)
router.get('/:projectId', protect, projectAccess('member'), getProject);
router.put('/:projectId', protect, projectAccess('admin'), ...projectValidation, validate, updateProject);
router.delete('/:projectId', protect, projectAccess('admin'), deleteProject);

// Member management (admin only)
router.post('/:projectId/members', protect, projectAccess('admin'), addMember);
router.delete('/:projectId/members/:userId', protect, projectAccess('admin'), removeMember);
router.put('/:projectId/members/:userId', protect, projectAccess('admin'), updateMemberRole);

module.exports = router;
