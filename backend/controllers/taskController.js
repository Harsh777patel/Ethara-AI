const { body } = require('express-validator');
const Task = require('../models/Task');
const Project = require('../models/Project');

// Validations
const taskValidation = [
  body('title').trim().isLength({ min: 2, max: 200 }).withMessage('Title must be 2-200 characters'),
  body('description').optional().isLength({ max: 1000 }).withMessage('Description max 1000 chars'),
  body('status').optional().isIn(['todo', 'in-progress', 'review', 'done']).withMessage('Invalid status'),
  body('priority').optional().isIn(['low', 'medium', 'high', 'critical']).withMessage('Invalid priority'),
];

// @desc  Create task in project
// @route POST /api/projects/:projectId/tasks
// @access Private + Member
const createTask = async (req, res) => {
  try {
    const { title, description, assignedTo, status, priority, dueDate, labels } = req.body;

    // Validate assignedTo is a project member (if provided)
    if (assignedTo) {
      const isMember = req.project.members.some(
        (m) => m.user.toString() === assignedTo
      );
      if (!isMember) {
        return res.status(400).json({
          success: false,
          message: 'Assigned user is not a project member',
        });
      }
    }

    // Only admins can assign tasks to others; members can only self-assign
    let finalAssignee = assignedTo;
    if (req.projectRole === 'member' && assignedTo && assignedTo !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Members can only assign tasks to themselves',
      });
    }

    const task = await Task.create({
      title,
      description,
      project: req.project._id,
      assignedTo: finalAssignee || null,
      createdBy: req.user._id,
      status,
      priority,
      dueDate,
      labels,
    });

    await task.populate('assignedTo', 'name email avatar');
    await task.populate('createdBy', 'name email avatar');

    res.status(201).json({ success: true, message: 'Task created', task });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc  Get tasks for a project
// @route GET /api/projects/:projectId/tasks
// @access Private + Member
const getProjectTasks = async (req, res) => {
  try {
    const { status, priority, assignedTo, search, sortBy = 'createdAt', order = 'desc' } = req.query;

    const filter = { project: req.project._id };
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (assignedTo) filter.assignedTo = assignedTo;
    if (search) filter.title = { $regex: search, $options: 'i' };

    const sortOrder = order === 'asc' ? 1 : -1;
    const validSortFields = ['createdAt', 'dueDate', 'priority', 'status', 'title'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';

    const tasks = await Task.find(filter)
      .populate('assignedTo', 'name email avatar')
      .populate('createdBy', 'name email avatar')
      .populate('comments.author', 'name email avatar')
      .sort({ [sortField]: sortOrder });

    res.json({ success: true, count: tasks.length, tasks });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc  Get single task
// @route GET /api/projects/:projectId/tasks/:taskId
// @access Private + Member
const getTask = async (req, res) => {
  try {
    const task = await Task.findOne({
      _id: req.params.taskId,
      project: req.project._id,
    })
      .populate('assignedTo', 'name email avatar')
      .populate('createdBy', 'name email avatar')
      .populate('comments.author', 'name email avatar');

    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    res.json({ success: true, task });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc  Update task
// @route PUT /api/projects/:projectId/tasks/:taskId
// @access Private + Member (members can update status; admins can update everything)
const updateTask = async (req, res) => {
  try {
    const task = await Task.findOne({
      _id: req.params.taskId,
      project: req.project._id,
    });

    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    // Members can only update status
    if (req.projectRole === 'member') {
      const allowedFields = ['status'];
      const requestedFields = Object.keys(req.body);
      const forbidden = requestedFields.filter((f) => !allowedFields.includes(f));
      if (forbidden.length > 0) {
        return res.status(403).json({
          success: false,
          message: `Members can only update: ${allowedFields.join(', ')}`,
        });
      }
    }

    const { title, description, assignedTo, status, priority, dueDate, labels } = req.body;

    if (title) task.title = title;
    if (description !== undefined) task.description = description;
    if (status) task.status = status;
    if (priority) task.priority = priority;
    if (dueDate !== undefined) task.dueDate = dueDate;
    if (labels) task.labels = labels;
    if (assignedTo !== undefined) {
      if (assignedTo) {
        const isMember = req.project.members.some(
          (m) => m.user.toString() === assignedTo
        );
        if (!isMember) {
          return res.status(400).json({
            success: false,
            message: 'Assigned user is not a project member',
          });
        }
      }
      task.assignedTo = assignedTo || null;
    }

    await task.save();
    await task.populate('assignedTo', 'name email avatar');
    await task.populate('createdBy', 'name email avatar');

    res.json({ success: true, message: 'Task updated', task });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc  Delete task (admin only)
// @route DELETE /api/projects/:projectId/tasks/:taskId
// @access Private + Project Admin
const deleteTask = async (req, res) => {
  try {
    const task = await Task.findOneAndDelete({
      _id: req.params.taskId,
      project: req.project._id,
    });

    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    res.json({ success: true, message: 'Task deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc  Add comment to task
// @route POST /api/projects/:projectId/tasks/:taskId/comments
// @access Private + Member
const addComment = async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ success: false, message: 'Comment text is required' });
    }

    const task = await Task.findOne({
      _id: req.params.taskId,
      project: req.project._id,
    });

    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    task.comments.push({ text: text.trim(), author: req.user._id });
    await task.save();
    await task.populate('comments.author', 'name email avatar');

    res.status(201).json({
      success: true,
      message: 'Comment added',
      comment: task.comments[task.comments.length - 1],
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc  Dashboard stats for logged-in user
// @route GET /api/tasks/dashboard
// @access Private
const getDashboardStats = async (req, res) => {
  try {
    const userId = req.user._id;

    // Projects user is member of
    const projects = await Project.find({ 'members.user': userId });
    const projectIds = projects.map((p) => p._id);

    const now = new Date();

    const [
      totalTasks,
      todoTasks,
      inProgressTasks,
      reviewTasks,
      doneTasks,
      overdueTasks,
      myTasks,
      recentTasks,
    ] = await Promise.all([
      Task.countDocuments({ project: { $in: projectIds } }),
      Task.countDocuments({ project: { $in: projectIds }, status: 'todo' }),
      Task.countDocuments({ project: { $in: projectIds }, status: 'in-progress' }),
      Task.countDocuments({ project: { $in: projectIds }, status: 'review' }),
      Task.countDocuments({ project: { $in: projectIds }, status: 'done' }),
      Task.countDocuments({
        project: { $in: projectIds },
        status: { $ne: 'done' },
        dueDate: { $lt: now },
      }),
      Task.find({ assignedTo: userId, status: { $ne: 'done' } })
        .populate('project', 'name')
        .sort({ dueDate: 1 })
        .limit(5),
      Task.find({ project: { $in: projectIds } })
        .populate('project', 'name')
        .populate('assignedTo', 'name avatar')
        .populate('createdBy', 'name avatar')
        .sort({ createdAt: -1 })
        .limit(8),
    ]);

    res.json({
      success: true,
      stats: {
        projects: projects.length,
        tasks: { total: totalTasks, todo: todoTasks, inProgress: inProgressTasks, review: reviewTasks, done: doneTasks, overdue: overdueTasks },
      },
      myTasks,
      recentTasks,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc  Get all tasks across projects for the logged-in user
// @route GET /api/tasks/all
// @access Private
const getAllTasks = async (req, res) => {
  try {
    const { status, priority, projectId, search, sortBy = 'createdAt', order = 'desc' } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (projectId) filter.project = projectId;
    if (search) filter.title = { $regex: search, $options: 'i' };

    // If admin, they can see all tasks. If member, only tasks in projects they are members of.
    if (req.user.role !== 'admin') {
      const projects = await Project.find({
        $or: [
          { 'members.user': req.user._id },
          { owner: req.user._id }
        ]
      });
      const projectIds = projects.map((p) => p._id);
      
      if (projectIds.length === 0) {
        return res.json({ success: true, count: 0, tasks: [], message: 'You are not a member of any projects' });
      }
      
      if (filter.project) {
        // Ensure they have access to the requested project filter
        if (!projectIds.some(id => id.toString() === filter.project.toString())) {
           return res.json({ success: true, count: 0, tasks: [] });
        }
      } else {
        filter.project = { $in: projectIds };
      }
    }

    const sortOrder = order === 'asc' ? 1 : -1;
    const validSortFields = ['createdAt', 'dueDate', 'priority', 'status', 'title'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';

    const tasks = await Task.find(filter)
      .populate('project', 'name')
      .populate('assignedTo', 'name email avatar')
      .populate('createdBy', 'name email avatar')
      .sort({ [sortField]: sortOrder });

    res.json({ success: true, count: tasks.length, tasks });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  taskValidation,
  createTask,
  getProjectTasks,
  getTask,
  updateTask,
  deleteTask,
  addComment,
  getDashboardStats,
  getAllTasks,
};
