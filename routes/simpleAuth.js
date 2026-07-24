const express = require('express');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const router = express.Router();

// Fixed admin credentials - loaded from environment variables
const ADMIN_CREDENTIALS = {
  username: process.env.ADMIN_USERNAME || 'admin',
  password: process.env.ADMIN_PASSWORD || 'admin123', // Fallback for safety
  email: process.env.ADMIN_EMAIL || 'genzlaundry.in@gmail.com'
};

// Validate that admin credentials are set
if (!process.env.ADMIN_USERNAME || !process.env.ADMIN_PASSWORD) {
  console.warn('⚠️  WARNING: Admin credentials not found in environment variables!');
//   console.warn('⚠️  Please set ADMIN_USERNAME and ADMIN_PASSWORD in your .env file');
  console.warn('⚠️  Using default credentials (NOT SECURE for production)');
}

// Hash the password once when server starts
let hashedPassword = null;
bcrypt.hash(ADMIN_CREDENTIALS.password, 12).then(hash => {
  hashedPassword = hash;
  console.log('🔐 Admin credentials initialized from environment variables');
  console.log(`👤 Admin username: ${ADMIN_CREDENTIALS.username}`);
  console.log(`📧 Admin email: ${ADMIN_CREDENTIALS.email}`);
});

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
    
    // For fixed admin, just verify the token is valid
    if (decoded.userId === 'admin') {
      req.user = { _id: 'admin', username: ADMIN_CREDENTIALS.username, role: 'admin' };
      req.sessionId = decoded.sessionId;
      next();
    } else {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

// Login endpoint
router.post('/login', authLimiter, extractClientInfo, async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username and password are required' });
    }

    // Check if credentials match
    if (username.trim() !== ADMIN_CREDENTIALS.username) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Wait for password to be hashed if not ready yet
    if (!hashedPassword) {
      return res.status(500).json({ success: false, message: 'Server is initializing, please try again' });
    }

    const isPasswordValid = await bcrypt.compare(password, hashedPassword);
    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Generate session ID and token
    const sessionId = require('crypto').randomBytes(32).toString('hex');
    const token = generateToken('admin', sessionId);

    // Log successful login
    console.log(`✅ Admin login successful from ${req.ipAddress} at ${new Date().toISOString()}`);

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: { 
        id: 'admin', 
        username: ADMIN_CREDENTIALS.username, 
        email: ADMIN_CREDENTIALS.email, 
        role: 'admin' 
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Server error during login' });
  }
});

// Logout endpoint
router.post('/logout', verifyToken, async (req, res) => {
  try {
    console.log(`📤 Admin logout from ${req.ipAddress} at ${new Date().toISOString()}`);
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ success: false, message: 'Server error during logout' });
  }
});

// Verify token endpoint
router.get('/verify', verifyToken, async (req, res) => {
  try {
    res.json({
      success: true,
      user: { 
        id: req.user._id, 
        username: req.user.username, 
        email: ADMIN_CREDENTIALS.email, 
        role: req.user.role 
      }
    });
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(500).json({ success: false, message: 'Server error during verification' });
  }
});

// Change password endpoint (to update the fixed password)
router.post('/change-password', verifyToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Current password and new password are required' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ success: false, message: 'New password must be at least 8 characters long' });
    }

    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, hashedPassword);
    if (!isCurrentPasswordValid) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect' });
    }

    // Update the password
    hashedPassword = await bcrypt.hash(newPassword, 12);
    ADMIN_CREDENTIALS.password = newPassword;

    console.log(`🔑 Admin password changed from ${req.ipAddress} at ${new Date().toISOString()}`);

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({ success: false, message: 'Server error during password change' });
  }
});

// Get user profile
router.get('/profile', verifyToken, async (req, res) => {
  try {
    res.json({
      success: true,
      user: {
        id: 'admin',
        username: ADMIN_CREDENTIALS.username,
        email: ADMIN_CREDENTIALS.email,
        role: 'admin',
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ success: false, message: 'Server error fetching profile' });
  }
});

module.exports = router;