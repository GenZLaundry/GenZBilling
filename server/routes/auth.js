const express = require('express');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const User = require('../models/User');
const router = express.Router();

// Rate limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { success: false, message: 'Too many authentication attempts, please try again later.' }
});

// Middleware to extract client info
const extractClientInfo = (req, res, next) => {
  req.deviceFingerprint = req.headers['x-device-fingerprint'] || 'unknown';
  req.ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
  req.userAgent = req.headers['user-agent'] || 'unknown';
  next();
};

// Generate JWT token
const generateToken = (userId, sessionId) => {
  return jwt.sign({ userId, sessionId }, process.env.JWT_SECRET || 'your-secret-key', { expiresIn: '24h' });
};

// Verify JWT token middleware
const verifyToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    const user = await User.findById(decoded.userId);
    
    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }

    req.user = user;
    req.sessionId = decoded.sessionId;
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

// Check if setup is required
router.get('/setup-required', async (req, res) => {
  try {
    const userCount = await User.countDocuments({ isActive: true });
    res.json({ success: true, setupRequired: userCount === 0, userCount });
  } catch (error) {
    console.error('Setup check error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Initial admin setup
router.post('/setup', extractClientInfo, async (req, res) => {
  try {
    const { username, password, email } = req.body;

    const userCount = await User.countDocuments({ isActive: true });
    if (userCount > 0) {
      return res.status(400).json({ success: false, message: 'Setup already completed' });
    }

    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username and password are required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters long' });
    }

    const user = new User({
      username: username.trim(),
      email: email?.trim(),
      password,
      role: 'admin',
      isActive: true
    });

    await user.save();
    await user.addDeviceFingerprint(req.deviceFingerprint, req.userAgent);
    const sessionId = await user.createSession(req.deviceFingerprint, req.ipAddress, req.userAgent);
    await user.addAuditLog('INITIAL_SETUP', req.ipAddress, req.userAgent, { username: user.username });

    const token = generateToken(user._id, sessionId);

    res.json({
      success: true,
      message: 'Admin account created successfully',
      token,
      user: { id: user._id, username: user.username, email: user.email, role: user.role }
    });

  } catch (error) {
    console.error('Setup error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Username or email already exists' });
    }
    res.status(500).json({ success: false, message: 'Server error during setup' });
  }
});

// Login
router.post('/login', authLimiter, extractClientInfo, async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username and password are required' });
    }

    const user = await User.findByLogin(username.trim());
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (user.isLocked) {
      const lockoutTime = Math.ceil((user.loginAttempts.lockoutUntil - Date.now()) / (1000 * 60));
      return res.status(423).json({ 
        success: false, 
        message: `Account locked. Try again in ${lockoutTime} minutes.`,
        lockoutTime
      });
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      await user.incLoginAttempts();
      await user.addAuditLog('LOGIN_FAILED', req.ipAddress, req.userAgent, {
        reason: 'Invalid password',
        username: username.trim()
      });
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const isDeviceAuthorized = user.isDeviceAuthorized(req.deviceFingerprint);
    if (!isDeviceAuthorized) {
      await user.addDeviceFingerprint(req.deviceFingerprint, req.userAgent);
    }

    await user.resetLoginAttempts();
    const sessionId = await user.createSession(req.deviceFingerprint, req.ipAddress, req.userAgent);
    await user.addAuditLog('LOGIN_SUCCESS', req.ipAddress, req.userAgent);

    const token = generateToken(user._id, sessionId);

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: { id: user._id, username: user.username, email: user.email, role: user.role }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Server error during login' });
  }
});

// Logout
router.post('/logout', verifyToken, async (req, res) => {
  try {
    const session = req.user.sessions.find(s => s.sessionId === req.sessionId);
    if (session) {
      session.isActive = false;
      await req.user.save();
    }
    await req.user.addAuditLog('LOGOUT', req.ipAddress, req.userAgent);
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ success: false, message: 'Server error during logout' });
  }
});

// Verify token
router.get('/verify', verifyToken, async (req, res) => {
  try {
    res.json({
      success: true,
      user: { id: req.user._id, username: req.user.username, email: req.user.email, role: req.user.role }
    });
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(500).json({ success: false, message: 'Server error during verification' });
  }
});

// Change password
router.post('/change-password', verifyToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Current password and new password are required' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ success: false, message: 'New password must be at least 8 characters long' });
    }

    const isCurrentPasswordValid = await req.user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect' });
    }

    req.user.password = newPassword;
    await req.user.save();
    await req.user.addAuditLog('PASSWORD_CHANGED', req.ipAddress, req.userAgent);

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({ success: false, message: 'Server error during password change' });
  }
});

// Get user profile
router.get('/profile', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password -securitySettings.twoFactorSecret');
    
    res.json({
      success: true,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
        lastLogin: user.sessions.filter(s => s.isActive).sort((a, b) => b.lastActivity - a.lastActivity)[0]?.lastActivity,
        deviceCount: user.deviceFingerprints.filter(d => d.isActive).length,
        sessionCount: user.sessions.filter(s => s.isActive).length
      }
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ success: false, message: 'Server error fetching profile' });
  }
});

module.exports = router;