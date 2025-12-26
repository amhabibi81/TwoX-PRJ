import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import * as userRepository from '../database/repositories/user.repository.js';
import { sanitizeUsername, sanitizeEmail } from '../utils/sanitize.js';
import logger from '../utils/logger.js';

export const signup = async (req, res) => {
  try {
    // Validation is handled by middleware, but sanitize inputs
    const { username, email, password } = req.body;

    // Sanitize inputs
    const sanitizedUsername = sanitizeUsername(username);
    const sanitizedEmail = sanitizeEmail(email);

    if (!sanitizedUsername || sanitizedUsername.length < 3) {
      return res.status(400).json({ error: 'Invalid username format' });
    }

    if (!sanitizedEmail) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Validate password length (already validated by Joi, but double-check)
    if (password.length < 6 || password.length > 128) {
      return res.status(400).json({ error: 'Password must be between 6 and 128 characters' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user with sanitized inputs (default role is 'member')
    const user = userRepository.createUser(sanitizedUsername, sanitizedEmail, passwordHash);

    // Generate JWT token with role
    const token = jwt.sign(
      { id: user.id, username: user.username, email: user.email, role: user.role || 'member' },
      config.jwtSecret,
      { expiresIn: '7d' }
    );

    // Log successful signup
    logger.info({
      event: 'user.signup.success',
      userId: user.id,
      username: user.username,
      email: sanitizedEmail,
      role: user.role,
      ip: req.ip
    }, 'User signup successful');

    res.status(201).json({
      message: 'User created successfully',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role || 'member'
      }
    });
  } catch (error) {
    if (error.message === 'Username or email already exists') {
      logger.warn({
        event: 'user.signup.failure',
        email: sanitizedEmail,
        reason: 'duplicate_email_or_username',
        ip: req.ip
      }, 'User signup failed: duplicate email or username');
      return res.status(409).json({ error: error.message });
    }
    
    logger.error({
      event: 'user.signup.failure',
      email: sanitizedEmail,
      reason: 'internal_error',
      error: error.message,
      ip: req.ip
    }, 'User signup error');
    
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const login = async (req, res) => {
  try {
    // Validation is handled by middleware, but sanitize inputs
    const { email, password } = req.body;

    // Sanitize email
    const sanitizedEmail = sanitizeEmail(email);

    if (!sanitizedEmail) {
      logger.warn({
        event: 'user.login.failure',
        email: email,
        reason: 'invalid_email_format',
        ip: req.ip
      }, `Login failed: Invalid email format - ${email}`);
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Log login attempt with sanitized email (for debugging)
    logger.debug({
      event: 'user.login.attempt',
      email: sanitizedEmail,
      ip: req.ip
    }, `Login attempt for email: ${sanitizedEmail}`);

    // Find user by email (use sanitized email)
    const user = userRepository.findUserByEmail(sanitizedEmail);

    if (!user) {
      logger.warn({
        event: 'user.login.failure',
        email: sanitizedEmail,
        originalEmail: email,
        reason: 'user_not_found',
        ip: req.ip,
        searchedEmail: sanitizedEmail
      }, `Login failed: User not found for email ${sanitizedEmail}`);
      
      // In development, provide more helpful error message
      const isDevelopment = process.env.NODE_ENV !== 'production';
      const errorMessage = isDevelopment 
        ? `Invalid credentials: No user found with email ${sanitizedEmail}`
        : 'Invalid credentials';
      
      return res.status(401).json({ error: errorMessage });
    }

    // Log that user was found (for debugging)
    logger.debug({
      event: 'user.login.user_found',
      userId: user.id,
      email: sanitizedEmail,
      username: user.username,
      role: user.role || 'member'
    }, `User found for login: ${sanitizedEmail} (ID: ${user.id})`);

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      logger.warn({
        event: 'user.login.failure',
        email: sanitizedEmail,
        userId: user.id,
        username: user.username,
        reason: 'invalid_password',
        passwordLength: password.length,
        ip: req.ip
      }, `Login failed: Invalid password for user ${sanitizedEmail} (ID: ${user.id})`);
      
      // In development, provide more helpful error message
      const isDevelopment = process.env.NODE_ENV !== 'production';
      const errorMessage = isDevelopment
        ? `Invalid credentials: Password incorrect for user ${sanitizedEmail}`
        : 'Invalid credentials';
      
      return res.status(401).json({ error: errorMessage });
    }

    // Get user role (default to 'member' if not set)
    const userRole = user.role || 'member';

    // Generate JWT token with role
    const token = jwt.sign(
      { id: user.id, username: user.username, email: user.email, role: userRole },
      config.jwtSecret,
      { expiresIn: '7d' }
    );

    // Log successful login
    logger.info({
      event: 'user.login.success',
      userId: user.id,
      email: sanitizedEmail,
      role: userRole,
      ip: req.ip
    }, 'User login successful');

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: userRole
      }
    });
  } catch (error) {
    logger.error({
      event: 'user.login.failure',
      email: sanitizedEmail,
      reason: 'internal_error',
      error: error.message,
      ip: req.ip
    }, 'Login error');
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Check if admin user exists
 * Returns admin user info (without password) if exists
 * Helps debug if admin user was created
 */
export const checkAdminUser = async (req, res) => {
  try {
    // Check if ADMIN_EMAILS is configured
    if (!config.adminEmails || config.adminEmails.length === 0) {
      return res.status(404).json({
        exists: false,
        message: 'ADMIN_EMAILS not configured',
        configuredEmail: null
      });
    }

    const adminEmail = config.adminEmails[0].toLowerCase().trim();
    
    // Find admin user by email
    const adminUser = userRepository.findUserByEmail(adminEmail);

    if (!adminUser) {
      logger.info({
        event: 'admin.user.check.notfound',
        email: adminEmail
      }, `Admin user check: ${adminEmail} not found`);
      
      return res.json({
        exists: false,
        message: `Admin user with email ${adminEmail} does not exist`,
        configuredEmail: adminEmail,
        suggestion: 'Run npm run create:admin to create the admin user'
      });
    }

    // Admin user exists - return info (without password)
    logger.info({
      event: 'admin.user.check.found',
      userId: adminUser.id,
      email: adminEmail
    }, `Admin user check: ${adminEmail} exists`);

    res.json({
      exists: true,
      message: `Admin user exists`,
      user: {
        id: adminUser.id,
        username: adminUser.username,
        email: adminUser.email,
        role: adminUser.role || 'member',
        createdAt: adminUser.created_at
      },
      configuredEmail: adminEmail
    });
  } catch (error) {
    logger.error({
      event: 'admin.user.check.error',
      error: error.message,
      stack: error.stack
    }, 'Error checking admin user');
    
    res.status(500).json({
      exists: false,
      error: 'Internal server error',
      message: error.message
    });
  }
};
