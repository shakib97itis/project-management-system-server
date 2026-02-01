const Project = require('../models/Project');
const { ApiError } = require('../utils/apiError');

async function createProject(req, res, next) {
  try {
    const { name, description = '' } = req.body;

    const project = await Project.create({
      name,
      description,
      createdBy: req.user._id,
    });

    res.status(201).json({ message: 'Project created', project });
  } catch (error) {
    next(error);
  }
}

async function listProjects(req, res, next) {
  try {
    const projects = await Project.find({ isDeleted: false }).sort({
      createdAt: -1,
    });

    res.status(200).json({
      status: 'success',
      projects,
    });
  } catch (error) {
    next(error);
  }
}

async function updateProject(req, res, next) {
  try {
    const { id: projectId } = req.params;

    const project = await Project.findById(projectId);
    if (!project || project.isDeleted)
      throw new ApiError(404, 'Project not found');

    const { name, description, status } = req.body;
    if (name !== undefined) project.name = name;
    if (description !== undefined) project.description = description;
    if (status !== undefined) project.status = status;

    await project.save();
    res.json({ message: 'Project updated', project });
  } catch (error) {
    next(error);
  }
}

async function softDeleteProject(req, res, next) {
  try {
    const { id: projectId } = req.params;

    const project = await Project.findById(projectId);
    if (!project || project.isDeleted)
      throw new ApiError(404, 'Project not found');

    project.isDeleted = true;
    project.status = 'DELETED';
    await project.save();

    res.json({ message: 'Project soft-deleted' });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createProject,
  listProjects,
  updateProject,
  softDeleteProject,
};
