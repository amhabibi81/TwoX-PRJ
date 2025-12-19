import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';

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
