const express = require('express');
const router = express.Router({ mergeParams: true }); // mergeParams for :projectId
const {
  taskValidation,
  createTask,
  getProjectTasks,
  getTask,
  updateTask,
  deleteTask,
  addComment,
  getDashboardStats,
  getAllTasks,
} = require('../controllers/taskController');
const { protect } = require('../middleware/auth');
const { projectAccess } = require('../middleware/projectAccess');
const validate = require('../middleware/validate');

// Standalone routes (mounted at /api/tasks)
router.get('/dashboard', protect, getDashboardStats);
router.get('/all', protect, getAllTasks);

// Task routes under /api/projects/:projectId/tasks
router.get('/', protect, projectAccess('member'), getProjectTasks);
router.post('/', protect, projectAccess('member'), ...taskValidation, validate, createTask);
router.get('/:taskId', protect, projectAccess('member'), getTask);
router.put('/:taskId', protect, projectAccess('member'), updateTask);
router.delete('/:taskId', protect, projectAccess('admin'), deleteTask);
router.post('/:taskId/comments', protect, projectAccess('member'), addComment);

module.exports = router;
