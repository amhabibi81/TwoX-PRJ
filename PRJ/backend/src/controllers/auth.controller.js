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

    // Create user with sanitized inputs
    const user = userRepository.createUser(sanitizedUsername, sanitizedEmail, passwordHash);

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, username: user.username, email: user.email },
      config.jwtSecret,
      { expiresIn: '7d' }
    );

    // Log successful signup
    logger.info({
      event: 'user.signup.success',
      userId: user.id,
      username: user.username,
      email: sanitizedEmail,
      ip: req.ip
    }, 'User signup successful');

    res.status(201).json({
      message: 'User created successfully',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email
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
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Find user by email (use sanitized email)
    const user = userRepository.findUserByEmail(sanitizedEmail);

    if (!user) {
      logger.warn({
        event: 'user.login.failure',
        email: sanitizedEmail,
        reason: 'user_not_found',
        ip: req.ip
      }, 'Login failed: user not found');
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      logger.warn({
        event: 'user.login.failure',
        email: sanitizedEmail,
        userId: user.id,
        reason: 'invalid_password',
        ip: req.ip
      }, 'Login failed: invalid password');
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, username: user.username, email: user.email },
      config.jwtSecret,
      { expiresIn: '7d' }
    );

    // Log successful login
    logger.info({
      event: 'user.login.success',
      userId: user.id,
      email: sanitizedEmail,
      ip: req.ip
    }, 'User login successful');

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email
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
