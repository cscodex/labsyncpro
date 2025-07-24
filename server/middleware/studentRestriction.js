// Middleware to restrict student access to administrative endpoints
const restrictStudentAccess = (req, res, next) => {
  if (req.user && req.user.role === 'student') {
    // List of endpoints students should not access
    const restrictedPaths = [
      '/api/users',
      '/api/labs',
      '/api/schedules',
      '/api/assignment-creation',
      '/api/assignment-management',
      '/api/capacity',
      '/api/inventory',
      '/api/import',
      '/api/export'
    ];

    // Check if the current path starts with any restricted path
    const isRestricted = restrictedPaths.some(path => 
      req.originalUrl.startsWith(path)
    );

    if (isRestricted) {
      return res.status(403).json({ 
        error: 'Access denied. Students cannot access administrative functions.' 
      });
    }
  }

  next();
};

module.exports = { restrictStudentAccess };
