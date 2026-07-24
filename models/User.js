const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 50
  },
  email: {
    type: String,
    required: false,
    unique: true,
    sparse: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true,
    minlength: 8
  },
  role: {
    type: String,
    enum: ['admin', 'manager', 'operator'],
    default: 'admin'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  deviceFingerprints: [{
    fingerprint: String,
    deviceInfo: String,
    lastUsed: Date,
    isActive: { type: Boolean, default: true }
  }],
  securitySettings: {
    twoFactorEnabled: { type: Boolean, default: false },
    twoFactorSecret: String,
    backupCodes: [String],
    passwordChangeRequired: { type: Boolean, default: false },
    lastPasswordChange: Date
  },
  loginAttempts: {
    count: { type: Number, default: 0 },
    lastAttempt: Date,
    lockoutUntil: Date
  },
  sessions: [{
    sessionId: String,
    deviceFingerprint: String,
    ipAddress: String,
    userAgent: String,
    createdAt: { type: Date, default: Date.now },
    lastActivity: { type: Date, default: Date.now },
    isActive: { type: Boolean, default: true }
  }],
  auditLog: [{
    action: String,
    timestamp: { type: Date, default: Date.now },
    ipAddress: String,
    userAgent: String,
    details: mongoose.Schema.Types.Mixed
  }]
}, {
  timestamps: true
});

// Indexes for performance
userSchema.index({ username: 1 });
userSchema.index({ email: 1 });
userSchema.index({ 'sessions.sessionId': 1 });
userSchema.index({ 'deviceFingerprints.fingerprint': 1 });

// Virtual for account lockout status
userSchema.virtual('isLocked').get(function() {
  return !!(this.loginAttempts.lockoutUntil && this.loginAttempts.lockoutUntil > Date.now());
});

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    this.securitySettings.lastPasswordChange = new Date();
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Method to increment login attempts
userSchema.methods.incLoginAttempts = function() {
  // If we have a previous lock that has expired, restart at 1
  if (this.loginAttempts.lockoutUntil && this.loginAttempts.lockoutUntil < Date.now()) {
    return this.updateOne({
      $unset: { 'loginAttempts.lockoutUntil': 1 },
      $set: {
        'loginAttempts.count': 1,
        'loginAttempts.lastAttempt': Date.now()
      }
    });
  }
  
  const updates = {
    $inc: { 'loginAttempts.count': 1 },
    $set: { 'loginAttempts.lastAttempt': Date.now() }
  };
  
  // Lock account after 5 failed attempts for 30 minutes
  if (this.loginAttempts.count + 1 >= 5 && !this.isLocked) {
    updates.$set['loginAttempts.lockoutUntil'] = Date.now() + (30 * 60 * 1000); // 30 minutes
  }
  
  return this.updateOne(updates);
};

// Method to reset login attempts
userSchema.methods.resetLoginAttempts = function() {
  return this.updateOne({
    $unset: {
      'loginAttempts.count': 1,
      'loginAttempts.lastAttempt': 1,
      'loginAttempts.lockoutUntil': 1
    }
  });
};

// Method to add device fingerprint
userSchema.methods.addDeviceFingerprint = function(fingerprint, deviceInfo) {
  // Remove existing fingerprint if it exists
  this.deviceFingerprints = this.deviceFingerprints.filter(
    device => device.fingerprint !== fingerprint
  );
  
  // Add new fingerprint
  this.deviceFingerprints.push({
    fingerprint,
    deviceInfo,
    lastUsed: new Date(),
    isActive: true
  });
  
  // Keep only last 5 devices
  if (this.deviceFingerprints.length > 5) {
    this.deviceFingerprints = this.deviceFingerprints
      .sort((a, b) => b.lastUsed - a.lastUsed)
      .slice(0, 5);
  }
  
  return this.save();
};

// Method to verify device fingerprint
userSchema.methods.isDeviceAuthorized = function(fingerprint) {
  return this.deviceFingerprints.some(
    device => device.fingerprint === fingerprint && device.isActive
  );
};

// Method to create session
userSchema.methods.createSession = function(deviceFingerprint, ipAddress, userAgent) {
  const sessionId = crypto.randomBytes(32).toString('hex');
  
  // Remove old sessions (keep only last 3 active sessions)
  this.sessions = this.sessions
    .filter(session => session.isActive)
    .sort((a, b) => b.lastActivity - a.lastActivity)
    .slice(0, 2);
  
  // Add new session
  this.sessions.push({
    sessionId,
    deviceFingerprint,
    ipAddress,
    userAgent,
    createdAt: new Date(),
    lastActivity: new Date(),
    isActive: true
  });
  
  return this.save().then(() => sessionId);
};

// Method to validate session
userSchema.methods.validateSession = function(sessionId, deviceFingerprint) {
  const session = this.sessions.find(
    s => s.sessionId === sessionId && s.isActive
  );
  
  if (!session) return false;
  
  // Check if session is expired (24 hours)
  const sessionAge = Date.now() - session.lastActivity;
  if (sessionAge > 24 * 60 * 60 * 1000) {
    session.isActive = false;
    this.save();
    return false;
  }
  
  // Verify device fingerprint
  if (session.deviceFingerprint !== deviceFingerprint) {
    session.isActive = false;
    this.save();
    return false;
  }
  
  // Update last activity
  session.lastActivity = new Date();
  this.save();
  
  return true;
};

// Method to add audit log entry
userSchema.methods.addAuditLog = function(action, ipAddress, userAgent, details = {}) {
  this.auditLog.push({
    action,
    timestamp: new Date(),
    ipAddress,
    userAgent,
    details
  });
  
  // Keep only last 100 audit entries
  if (this.auditLog.length > 100) {
    this.auditLog = this.auditLog.slice(-100);
  }
  
  return this.save();
};

// Method to generate 2FA backup codes
userSchema.methods.generateBackupCodes = function() {
  const codes = [];
  for (let i = 0; i < 10; i++) {
    codes.push(crypto.randomBytes(4).toString('hex').toUpperCase());
  }
  this.securitySettings.backupCodes = codes;
  return codes;
};

// Static method to find user by username or email
userSchema.statics.findByLogin = function(login) {
  return this.findOne({
    $or: [
      { username: login },
      { email: login }
    ],
    isActive: true
  });
};

module.exports = mongoose.model('User', userSchema);