import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import * as userRepository from '../database/repositories/user.repository.js';
import { ROLES, isValidRole } from '../config/roles.config.js';

export default function auth(req, res, next) {
  // Check if Authorization header exists
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return res.status(401).json({ error: 'Authorization header required' });
  }

  // Validate Bearer token format (case-insensitive)
  const bearerRegex = /^Bearer\s+(.+)$/i;
  const match = authHeader.match(bearerRegex);
  
  if (!match) {
    return res.status(401).json({ 
      error: 'Invalid authorization format. Expected: Bearer <token>' 
    });
  }

  const token = match[1].trim();
  
  if (!token) {
    return res.status(401).json({ 
      error: 'Invalid authorization format. Expected: Bearer <token>' 
    });
  }

  // Verify JWT token
  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    
    // Attach user to request (contains id, username, email from JWT payload)
    req.user = decoded;
    
    // Backward compatibility: If role is missing in JWT, fetch from database
    if (!req.user.role || !isValidRole(req.user.role)) {
      try {
        const userRecord = userRepository.findUserById(req.user.id);
        if (userRecord && userRecord.role) {
          req.user.role = userRecord.role;
        } else {
          // Default to member if no role found
          req.user.role = ROLES.MEMBER;
        }
      } catch (error) {
        // If database fetch fails, default to member
        req.user.role = ROLES.MEMBER;
      }
    }
    
    next();
  } catch (error) {
    // Handle specific JWT errors
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ error: 'Token expired' });
    }
    
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    // Handle other JWT errors
    return res.status(401).json({ error: 'Token verification failed' });
  }
}
