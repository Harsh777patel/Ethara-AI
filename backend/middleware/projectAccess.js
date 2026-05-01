const Project = require('../models/Project');

// Middleware: check if user is a member of the project and attach project role
const projectAccess = (requiredRole = 'member') => {
  return async (req, res, next) => {
    try {
      const project = await Project.findById(req.params.projectId || req.body.project);

      if (!project) {
        return res.status(404).json({ success: false, message: 'Project not found' });
      }

      const projectRole = project.getMemberRole(req.user._id);

      if (!projectRole) {
        return res.status(403).json({
          success: false,
          message: 'You are not a member of this project',
        });
      }

      // Check role hierarchy: admin > member
      if (requiredRole === 'admin' && projectRole !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Only project admins can perform this action',
        });
      }

      req.project = project;
      req.projectRole = projectRole;
      next();
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  };
};

module.exports = { projectAccess };
