const express = require('express');
const router = express.Router();
const {
  register,
  registerValidation,
  login,
  loginValidation,
  getMe,
  updateProfile,
  getAllUsers,
  getAdminStats,
} = require('../controllers/authController');
const { protect, restrictTo } = require('../middleware/auth');
const validate = require('../middleware/validate');

router.post('/register', ...registerValidation, validate, register);
router.post('/login', ...loginValidation, validate, login);
router.get('/me', protect, getMe);
router.put('/me', protect, updateProfile);
router.get('/users', protect, getAllUsers);
router.get('/admin/stats', protect, restrictTo('admin'), getAdminStats);

module.exports = router;
