import { initializeApp } from 'firebase/app';
import {
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile
} from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  query,
  setDoc,
  where
} from 'firebase/firestore';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDnW72fkdhDTTlAo5QbkmO0gEm5k8KuGpQ",
  authDomain: "m-vet-4c7f5.firebaseapp.com",
  projectId: "m-vet-4c7f5",
  storageBucket: "m-vet-4c7f5.firebasestorage.app",
  messagingSenderId: "617046257726",
  appId: "1:617046257726:web:3f581b0eb208c9429c616f",
  measurementId: "G-7DX98GX8VB"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Flag to track admin creation status
let adminCreationInProgress = false;
let adminCreationComplete = false;
const adminEmail = 'admin@coffee.fund';
const adminPassword = 'admin123';

// Create default admin user if it doesn't exist
const createDefaultAdminIfNotExists = async () => {
  // Avoid multiple simultaneous creation attempts
  if (adminCreationInProgress) {
    console.log("Admin creation already in progress...");
    return;
  }
  
  adminCreationInProgress = true;
  
  try {
    console.log("Attempting to create default admin user...");
    
    // First check if the admin exists in Firestore
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', adminEmail), where('role', '==', 'admin'));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        console.log('Default admin user already exists in Firestore');
        adminCreationComplete = true;
        adminCreationInProgress = false;
        return;
      }
    } catch (error) {
      console.error('Error checking Firestore for admin user:', error);
    }
    
    // Try to directly create the admin user in Firebase Auth
    try {
      console.log("Trying to create admin user in Firebase Auth...");
      const userCredential = await createUserWithEmailAndPassword(auth, adminEmail, adminPassword);
      const user = userCredential.user;
      
      console.log("Admin user created successfully in Firebase Auth:", user.uid);
      
      // Update user profile
      await updateProfile(user, {
        displayName: 'Coffee Fund Admin'
      });
      
      // Create admin record in Firestore
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        displayName: 'Coffee Fund Admin',
        email: adminEmail,
        role: 'admin',
        department: 'Administration',
        createdAt: new Date().toISOString()
      });
      
      console.log('Default admin user created successfully in both Auth and Firestore');
      adminCreationComplete = true;
      
      // Sign out after creating
      await signOut(auth);
      return;
    } catch (error) {
      // Handle the case where user might already exist
      if (error.code === 'auth/email-already-in-use') {
        console.log('Admin user already exists in Auth, checking Firestore...');
      } else {
        console.error('Error creating admin user:', error.code, error.message);
      }
    }
    
    // If we get here, the user exists in Auth but might not be in Firestore
    // Try to sign in and verify/create the Firestore record
    try {
      console.log("Admin exists in Auth but might not be in Firestore, trying to retrieve...");
      
      // Try to sign in to get the user
      const userCredential = await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
      const user = userCredential.user;
      
      console.log("Retrieved existing admin user:", user.uid);
      
      // Create admin record in Firestore if it doesn't exist
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (!userDoc.exists()) {
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          displayName: 'Coffee Fund Admin',
          email: adminEmail,
          role: 'admin',
          department: 'Administration',
          createdAt: new Date().toISOString()
        });
        console.log('Admin user added to Firestore successfully');
      } else {
        console.log('Admin user already exists in Firestore');
      }
      
      // Sign out after creating the record
      await signOut(auth);
      
      adminCreationComplete = true;
    } catch (signInError) {
      console.error('Error signing in as admin:', signInError.code, signInError.message);
      
      // If we can't sign in, the issue might be with the Firebase project setup
      console.error('Please check your Firebase project configuration and make sure Email/Password authentication is enabled');
    }
  } catch (error) {
    console.error('Error in createDefaultAdminIfNotExists:', error);
  } finally {
    adminCreationInProgress = false;
    
    // If admin creation failed, log a clear message
    if (!adminCreationComplete) {
      console.error('⚠️ ADMIN CREATION FAILED: The default admin account could not be created.');
      console.error(`Please manually create an account with email: ${adminEmail} and password: ${adminPassword}`);
    }
  }
};

// Firebase Authentication functions
const loginWithEmailPassword = async (email, password) => {
  // If admin creation is still in progress, wait a bit
  if (adminCreationInProgress) {
    console.log("Admin creation in progress, waiting before login attempt...");
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Get additional user data from Firestore
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    
    if (userDoc.exists()) {
      return {
        ...user,
        ...userDoc.data()
      };
    } else {
      // If user exists in Auth but not in Firestore, create the record
      const userData = {
        uid: user.uid,
        displayName: user.displayName || email.split('@')[0],
        email: user.email,
        role: 'user', // Default role
        createdAt: new Date().toISOString()
      };
      
      await setDoc(doc(db, 'users', user.uid), userData);
      return {
        ...user,
        ...userData
      };
    }
  } catch (error) {
    console.error('Login error:', error.code, error.message);
    
    // If login fails and it's the admin account, try to create it again
    if (email === adminEmail && password === adminPassword && !adminCreationComplete) {
      console.log("Login failed for admin, attempting to create admin account again...");
      await createDefaultAdminIfNotExists();
      
      // Try login again after admin creation
      return loginWithEmailPassword(email, password);
    }
    
    throw error;
  }
};

const logoutUser = async () => {
  try {
    await signOut(auth);
    return true;
  } catch (error) {
    console.error('Logout error:', error);
    throw error;
  }
};

const getCurrentUser = () => {
  return new Promise((resolve, reject) => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      unsubscribe();
      
      if (user) {
        // Get additional user data from Firestore
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          
          if (userDoc.exists()) {
            resolve({
              ...user,
              ...userDoc.data()
            });
          } else {
            resolve(user);
          }
        } catch (error) {
          console.error('Error getting user data:', error);
          resolve(user);
        }
      } else {
        resolve(null);
      }
    }, reject);
  });
};

// Initialize the app by checking/creating default admin
createDefaultAdminIfNotExists();

// Function to bypass Firebase Auth and create a direct Firestore user
// Use this only if you're encountering auth/operation-not-allowed errors
export const createLocalUserBypassingAuth = async () => {
  try {
    console.log("Attempting to create local-only user record...");
    
    // Create a temporary user ID
    const tempUserId = `local_${Date.now()}`;
    
    // Create user record directly in Firestore
    await setDoc(doc(db, 'users', tempUserId), {
      uid: tempUserId,
      displayName: 'Coffee Fund Developer',
      email: defaultAdminCredentials.email,
      role: 'admin',
      department: 'Development',
      isLocalOnly: true, // Flag to identify this is not a real auth user
      createdAt: new Date().toISOString()
    });
    
    console.log('Local-only user created with ID:', tempUserId);
    console.log('IMPORTANT: This is a development-only workaround.');
    console.log('Please enable Email/Password authentication in Firebase console.');
    
    // Return the user object
    return {
      uid: tempUserId,
      email: defaultAdminCredentials.email,
      displayName: 'Coffee Fund Developer',
      role: 'admin',
      isLocalOnly: true
    };
  } catch (error) {
    console.error('Error creating local-only user:', error);
    throw error;
  }
};

// Export admin credentials for easy access
export const defaultAdminCredentials = {
  email: adminEmail,
  password: adminPassword
};

export {
  auth,
  db,
  getCurrentUser,
  loginWithEmailPassword,
  logoutUser
};

