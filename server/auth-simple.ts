import type { Request, Response } from "express";
import { storage } from "./storage";

// Simple authentication middleware for development
export const simpleAuth = async (req: Request, res: Response, next: Function) => {
  try {
    // For development, we'll use a hardcoded user ID or create one
    const testEmail = "test@example.com";
    const testFirebaseUid = "test-uid-123";
    
    // Try to find existing user
    let user = await storage.getUserByEmail(testEmail);
    
    if (!user) {
      // Create a test user if none exists
      try {
        user = await storage.createUser({
          firebaseUid: testFirebaseUid,
          email: testEmail,
          displayName: "Test User",
          photoUrl: ""
        });
      } catch (error: any) {
        // If user already exists, find them
        if (error.code === '23505') {
          user = await storage.getUserByEmail(testEmail);
        } else {
          throw error;
        }
      }
    }
    
    if (!user) {
      return res.status(500).json({ error: "Could not create or find user" });
    }
    
    // Attach user to request
    (req as any).user = user;
    next();
    
  } catch (error) {
    console.error('Simple auth error:', error);
    return res.status(500).json({ error: "Authentication failed" });
  }
};