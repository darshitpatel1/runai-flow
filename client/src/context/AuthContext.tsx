import React, { createContext, useContext, useState, useEffect } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase";

interface AuthContextType {
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
});

// Helper function to register user with our backend
async function registerUserWithBackend(user: User) {
  try {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        firebaseUid: user.uid,
        email: user.email,
        displayName: user.displayName || '',
        photoUrl: user.photoURL || '',
      }),
    });
    
    // 409 means the user already exists, which is fine
    if (response.status === 409) {
      console.log('User already exists in the database');
      return true;
    }
    
    if (!response.ok) {
      console.error('Failed to register with backend');
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error registering with backend:', error);
    return false;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up the auth state listener
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // If we have a user, make sure they're registered with our backend
        try {
          await registerUserWithBackend(firebaseUser);
        } catch (error) {
          console.error("Error ensuring user is registered with backend:", error);
        }
      }
      
      setUser(firebaseUser);
      setLoading(false);
    });

    // Clean up the listener when the component unmounts
    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
