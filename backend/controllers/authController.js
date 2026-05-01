const jwt = require('jsonwebtoken');
const { body } = require('express-validator');
const User = require('../models/User');
const validate = require('../middleware/validate');

// Generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE,
  });
};

// @desc  Register new user
// @route POST /api/auth/register
// @access Public
const registerValidation = [
  body('name').trim().isLength({ min: 2, max: 50 }).withMessage('Name must be 2-50 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Invalid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').optional().isIn(['admin', 'member']).withMessage('Role must be admin or member'),
];

const register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ success: false, message: 'Email already registered' });
    }

    const user = await User.create({ name, email, password, role: role || 'member' });
    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc  Login user
// @route POST /api/auth/login
// @access Public
const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Invalid email'),
  body('password').notEmpty().withMessage('Password is required'),
];

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (!user.isActive) {
      return res.status(401).json({ success: false, message: 'Account is deactivated' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = generateToken(user._id);

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc  Get current user profile
// @route GET /api/auth/me
// @access Private
const getMe = async (req, res) => {
  res.json({ success: true, user: req.user });
};

// @desc  Update profile
// @route PUT /api/auth/me
// @access Private
const updateProfile = async (req, res) => {
  try {
    const { name, avatar } = req.body;
    const updates = {};
    if (name) updates.name = name;
    if (avatar !== undefined) updates.avatar = avatar;

    const user = await User.findByIdAndUpdate(req.user._id, updates, {
      new: true,
      runValidators: true,
    });

    res.json({ success: true, message: 'Profile updated', user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc  Get all users
// @route GET /api/auth/users
// @access Private
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json({ success: true, count: users.length, users });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc  Admin dashboard — system-wide stats
// @route GET /api/auth/admin/stats
// @access Private/Admin
const getAdminStats = async (req, res) => {
  try {
    const Project = require('../models/Project');
    const Task    = require('../models/Task');
    const now     = new Date();

    const [
      totalUsers,
      adminUsers,
      memberUsers,
      totalProjects,
      activeProjects,
      completedProjects,
      taskStatusBreakdown,
      taskPriorityBreakdown,
      overdueCount,
      recentUsers,
      recentProjects,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'admin' }),
      User.countDocuments({ role: 'member' }),
      Project.countDocuments(),
      Project.countDocuments({ status: 'active' }),
      Project.countDocuments({ status: 'completed' }),
      Task.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Task.aggregate([{ $group: { _id: '$priority', count: { $sum: 1 } } }]),
      Task.countDocuments({ status: { $ne: 'done' }, dueDate: { $lt: now } }),
      User.find().select('-password').sort({ createdAt: -1 }).limit(5),
      Project.find()
        .populate('owner', 'name email')
        .sort({ createdAt: -1 })
        .limit(6),
    ]);

    // Flatten task status breakdown
    const taskStats = { todo: 0, 'in-progress': 0, review: 0, done: 0, total: 0 };
    taskStatusBreakdown.forEach(({ _id, count }) => {
      taskStats[_id] = count;
      taskStats.total += count;
    });

    const priorityStats = { low: 0, medium: 0, high: 0, critical: 0 };
    taskPriorityBreakdown.forEach(({ _id, count }) => {
      if (_id) priorityStats[_id] = count;
    });

    // Attach task counts to recent projects
    const projectsWithStats = await Promise.all(
      recentProjects.map(async (p) => {
        const counts = await Task.aggregate([
          { $match: { project: p._id } },
          { $group: { _id: '$status', count: { $sum: 1 } } },
        ]);
        const s = { todo: 0, 'in-progress': 0, review: 0, done: 0, total: 0 };
        counts.forEach(({ _id, count }) => { s[_id] = count; s.total += count; });
        return { ...p.toObject(), taskStats: s };
      })
    );

    res.json({
      success: true,
      stats: {
        users:    { total: totalUsers, admins: adminUsers, members: memberUsers },
        projects: { total: totalProjects, active: activeProjects, completed: completedProjects },
        tasks:    { ...taskStats, overdue: overdueCount },
        priority: priorityStats,
      },
      recentUsers,
      recentProjects: projectsWithStats,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  register,
  registerValidation,
  login,
  loginValidation,
  getMe,
  updateProfile,
  getAllUsers,
  getAdminStats,
};
