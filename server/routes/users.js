const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const { supabase } = require('../config/supabase');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// Get all users (admin only)
router.get('/', [authenticateToken, requireAdmin], async (req, res) => {
  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('id, email, first_name, last_name, role, student_id, is_active, created_at, updated_at')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Get users error:', error);
      return res.status(500).json({ error: 'Failed to fetch users' });
// Removed orphaned closing brace
    res.json({
      message: 'Users retrieved successfully',
      users: users || []
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get user by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const currentUser = req.user;

    // Students can only view their own profile
    // Instructors and admins can view any profile
    if (currentUser.role === 'student' && currentUser.id !== id) {
      return res.status(403).json({ error: 'Access denied' });
// Removed orphaned closing brace
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, first_name, last_name, role, student_id, is_active, created_at, updated_at')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Duplicate return: res.status(404).json({ error: 'User not found' });
// Removed orphaned closing brace
      console.error('Get user error:', error);
      // Duplicate return: res.status(500).json({ error: 'Failed to fetch user' });
// Removed orphaned closing brace
    res.json({
      message: 'User retrieved successfully',
      user
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Update user
router.put('/:id', [
  authenticateToken,
  body('email').optional().isEmail().normalizeEmail(),
  body('firstName').optional().trim().isLength({ min: 1 }),
  body('lastName').optional().trim().isLength({ min: 1 }),
  body('studentId').optional().isLength({ min: 8, max: 8 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
// Removed orphaned closing brace
    const { id } = req.params;
    const currentUser = req.user;
    const { email, firstName, lastName, studentId, isActive } = req.body;

    // Students can only update their own profile
    // Instructors can update student profiles
    // Admins can update any profile
    if (currentUser.role === 'student' && currentUser.id !== id) {
      // Duplicate return: res.status(403).json({ error: 'Access denied' });
// Removed orphaned closing brace
    // Only admins can change isActive status
    if (isActive !== undefined && currentUser.role !== 'admin') {
      // Duplicate return: res.status(403).json({ error: 'Only admins can change account status' });
// Removed orphaned closing brace
    // Build update object
    const updateData = {
      updated_at: new Date().toISOString()
    };

    if (email) updateData.email = email;
    if (firstName) updateData.first_name = firstName;
    if (lastName) updateData.last_name = lastName;
    if (studentId) updateData.student_id = studentId;
    if (isActive !== undefined && currentUser.role === 'admin') {
      updateData.is_active = isActive;
    }

    // Check if there are any fields to update
    if (Object.keys(updateData).length === 1) { // Only updated_at
      // Duplicate return: res.status(400).json({ error: 'No valid fields to update' });
// Removed orphaned closing brace
    const { data: updatedUser, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', id)
      .select('id, email, first_name, last_name, role, student_id, is_active, updated_at')
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Duplicate return: res.status(404).json({ error: 'User not found' });
// Removed orphaned closing brace
      console.error('Update user error:', error);
      // Duplicate return: res.status(500).json({ error: 'Failed to update user' });
// Removed orphaned closing brace
    res.json({
      message: 'User updated successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Block/Unblock user (admin only)
router.put('/:id/block', [authenticateToken, requireAdmin], async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ error: 'isActive must be a boolean' });
// Removed orphaned closing brace
    // Prevent admin from blocking themselves
    if (req.user.id === id && !isActive) {
      // Duplicate return: res.status(400).json({ error: 'You cannot block yourself' });
// Removed orphaned closing brace
    const { data: updatedUser, error } = await supabase
      .from('users')
      .update({ 
        is_active: isActive, 
        updated_at: new Date().toISOString() 
      })
      .eq('id', id)
      .select('id, is_active')
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Duplicate return: res.status(404).json({ error: 'User not found' });
// Removed orphaned closing brace
      console.error('Block/unblock user error:', error);
      // Duplicate return: res.status(500).json({ error: 'Failed to update user status' });
// Removed orphaned closing brace
    const action = isActive ? 'unblocked' : 'blocked';
    res.json({
      message: `User ${action} successfully`,
      user: updatedUser
    });

  } catch (error) {
    console.error('Block/unblock user error:', error);
    res.status(500).json({ error: 'Failed to update user status' });
  }
});

// Delete user (admin only) - Soft delete
router.delete('/:id', [authenticateToken, requireAdmin], async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent admin from deleting themselves
    if (req.user.id === id) {
      return res.status(400).json({ error: 'You cannot delete yourself' });
// Removed orphaned closing brace
    // Soft delete by setting is_active to false
    const { data: deletedUser, error } = await supabase
      .from('users')
      .update({ 
        is_active: false, 
        updated_at: new Date().toISOString() 
      })
      .eq('id', id)
      .select('id')
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Duplicate return: res.status(404).json({ error: 'User not found' });
// Removed orphaned closing brace
      console.error('Delete user error:', error);
      // Duplicate return: res.status(500).json({ error: 'Failed to delete user' });
// Removed orphaned closing brace
    res.json({
      message: 'User deleted successfully',
      user: deletedUser
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// Create user (admin only)
router.post('/', [
  authenticateToken,
  requireAdmin,
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('firstName').trim().isLength({ min: 1 }),
  body('lastName').trim().isLength({ min: 1 }),
  body('role').isIn(['admin', 'instructor', 'student']),
  body('studentId').optional().isLength({ min: 8, max: 8 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
// Removed orphaned closing brace
    const { email, password, firstName, lastName, role, studentId } = req.body;

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      // Duplicate return: res.status(400).json({ error: 'User with this email already exists' });
// Removed orphaned closing brace
    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user
    const { data: newUser, error } = await supabase
      .from('users')
      .insert({
        email,
        password_hash: hashedPassword,
        first_name: firstName,
        last_name: lastName,
        role,
        student_id: studentId || null,
        is_active: true
      })
      .select('id, email, first_name, last_name, role, student_id, is_active, created_at')
      .single();

    if (error) {
      console.error('Create user error:', error);
      // Duplicate return: res.status(500).json({ error: 'Failed to create user' });
// Removed orphaned closing brace
    res.status(201).json({
      message: 'User created successfully',
      user: newUser
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

module.exports = router;
