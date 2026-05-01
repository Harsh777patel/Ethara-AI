const { body } = require('express-validator');
const Project = require('../models/Project');
const Task = require('../models/Task');
const User = require('../models/User');

// Validations
const projectValidation = [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Project name must be 2-100 characters'),
  body('description').optional().isLength({ max: 500 }).withMessage('Description max 500 chars'),
  body('status').optional().isIn(['active', 'on-hold', 'completed', 'cancelled']).withMessage('Invalid status'),
  body('priority').optional().isIn(['low', 'medium', 'high', 'critical']).withMessage('Invalid priority'),
];

// @desc  Create project
// @route POST /api/projects
// @access Private
const createProject = async (req, res) => {
  try {
    const { name, description, status, priority, dueDate, tags, memberIds } = req.body;

    const initialMembers = [{ user: req.user._id, role: 'admin' }];
    if (memberIds && Array.isArray(memberIds)) {
      memberIds.forEach(id => {
        if (id && id.toString() !== req.user._id.toString()) {
          initialMembers.push({ user: id, role: 'member' });
        }
      });
    }

    const project = await Project.create({
      name,
      description,
      status,
      priority,
      dueDate: dueDate || null,
      tags,
      owner: req.user._id,
      members: initialMembers,
    });

    await project.populate('owner', 'name email avatar role');
    await project.populate('members.user', 'name email avatar role');

    res.status(201).json({ success: true, message: 'Project created', project });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc  Get all projects user is member of
// @route GET /api/projects
// @access Private
const getProjects = async (req, res) => {
  try {
    const projects = await Project.find({
      'members.user': req.user._id,
    })
      .populate('owner', 'name email avatar role')
      .populate('members.user', 'name email avatar role')
      .sort({ createdAt: -1 });

    // Attach task counts
    const projectsWithStats = await Promise.all(
      projects.map(async (project) => {
        const taskCounts = await Task.aggregate([
          { $match: { project: project._id } },
          { $group: { _id: '$status', count: { $sum: 1 } } },
        ]);

        const stats = { todo: 0, 'in-progress': 0, review: 0, done: 0, total: 0 };
        taskCounts.forEach(({ _id, count }) => {
          stats[_id] = count;
          stats.total += count;
        });

        return { ...project.toObject(), taskStats: stats };
      })
    );

    res.json({ success: true, count: projects.length, projects: projectsWithStats });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc  Get single project
// @route GET /api/projects/:projectId
// @access Private + Member
const getProject = async (req, res) => {
  try {
    // req.project is already attached by projectAccess middleware
    await req.project.populate('owner', 'name email avatar role');
    await req.project.populate('members.user', 'name email avatar role');

    const taskStats = await Task.aggregate([
      { $match: { project: req.project._id } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    const stats = { todo: 0, 'in-progress': 0, review: 0, done: 0, total: 0 };
    taskStats.forEach(({ _id, count }) => {
      stats[_id] = count;
      stats.total += count;
    });

    res.json({
      success: true,
      project: { ...req.project.toObject(), taskStats: stats },
      userRole: req.projectRole,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc  Update project (admin only)
// @route PUT /api/projects/:projectId
// @access Private + Project Admin
const updateProject = async (req, res) => {
  try {
    const { name, description, status, priority, dueDate, tags } = req.body;
    const updates = {};
    if (name) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (status) updates.status = status;
    if (priority) updates.priority = priority;
    if (dueDate !== undefined) updates.dueDate = dueDate;
    if (tags) updates.tags = tags;

    const project = await Project.findByIdAndUpdate(req.project._id, updates, {
      new: true,
      runValidators: true,
    })
      .populate('owner', 'name email avatar role')
      .populate('members.user', 'name email avatar role');

    res.json({ success: true, message: 'Project updated', project });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc  Delete project (admin only)
// @route DELETE /api/projects/:projectId
// @access Private + Project Admin
const deleteProject = async (req, res) => {
  try {
    // Only owner can delete
    if (req.project.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Only the project owner can delete the project',
      });
    }

    await Task.deleteMany({ project: req.project._id });
    await Project.findByIdAndDelete(req.project._id);

    res.json({ success: true, message: 'Project and all associated tasks deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc  Add member to project (admin only)
// @route POST /api/projects/:projectId/members
// @access Private + Project Admin
const addMember = async (req, res) => {
  try {
    const { email, role = 'member' } = req.body;

    const userToAdd = await User.findOne({ email });
    if (!userToAdd) {
      return res.status(404).json({ success: false, message: 'User not found with that email' });
    }

    const isAlreadyMember = req.project.members.some(
      (m) => m.user.toString() === userToAdd._id.toString()
    );
    if (isAlreadyMember) {
      return res.status(409).json({ success: false, message: 'User is already a project member' });
    }

    req.project.members.push({ user: userToAdd._id, role });
    await req.project.save();
    await req.project.populate('members.user', 'name email avatar role');

    res.json({ success: true, message: 'Member added successfully', project: req.project });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc  Remove member (admin only)
// @route DELETE /api/projects/:projectId/members/:userId
// @access Private + Project Admin
const removeMember = async (req, res) => {
  try {
    const { userId } = req.params;

    if (req.project.owner.toString() === userId) {
      return res.status(400).json({ success: false, message: 'Cannot remove the project owner' });
    }

    req.project.members = req.project.members.filter(
      (m) => m.user.toString() !== userId
    );
    await req.project.save();

    // Unassign tasks from removed member
    await Task.updateMany(
      { project: req.project._id, assignedTo: userId },
      { $set: { assignedTo: null } }
    );

    res.json({ success: true, message: 'Member removed', project: req.project });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc  Update member role (admin only)
// @route PUT /api/projects/:projectId/members/:userId
// @access Private + Project Admin
const updateMemberRole = async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    if (!['admin', 'member'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Role must be admin or member' });
    }

    const member = req.project.members.find((m) => m.user.toString() === userId);
    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }

    member.role = role;
    await req.project.save();
    await req.project.populate('members.user', 'name email avatar role');

    res.json({ success: true, message: 'Member role updated', project: req.project });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  projectValidation,
  createProject,
  getProjects,
  getProject,
  updateProject,
  deleteProject,
  addMember,
  removeMember,
  updateMemberRole,
};
