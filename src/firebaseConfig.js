import { initializeApp } from "firebase/app";
import { getAuth, signOut, GoogleAuthProvider,connectAuthEmulator, signInWithPopup, createUserWithEmailAndPassword, signInWithEmailAndPassword ,updateProfile } from "firebase/auth";
import { getFirestore,connectFirestoreEmulator, collection, addDoc, getDocs, query, where, doc,setDoc, getDoc, updateDoc } from "firebase/firestore"; // Import missing functions

const firebaseConfig = {
  apiKey: "AIzaSyCLig9qWhJzyLGn_Ru9Knflb5rtPOV4ImU",
  authDomain: "ishara-1d9b9.firebaseapp.com",
  projectId: "ishara-1d9b9",
  storageBucket: "ishara-1d9b9.appspot.com",
  messagingSenderId: "877815674954",
  appId: "1:877815674954:web:9214186ffc151c10858eb3",
  measurementId: "G-CZ5QLH133T"
};

const provider = new GoogleAuthProvider();


// Initialize Firebase
const app = initializeApp(firebaseConfig);
// Initialize Firestore
const db = getFirestore(app);

const auth = getAuth(app);


if (window.location.hostname === 'localhost') {
  connectFirestoreEmulator(db, 'localhost', 8080);
}

// Google Sign-In
// firebaseConfig.js
export const signInWithGoogle = () => {
  return signInWithPopup(auth, provider)
    .then((result) => {
      console.log('User signed in:', result.user);
      return result.user; // Return the signed-in user
    })
    .catch((error) => {
      console.error('Error signing in with Google:', error);
      throw error;
    });
};

// Email/Password Sign-Up
export const signUpWithEmail = async (email, password, username) => {
  try {
    // Create user with email and password
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Update the user's display name in Firebase Auth
    await updateProfile(user, {
      displayName: username,
    });

    // Save additional user data to Firestore
    await setDoc(doc(db, 'users', user.uid), {
      username: username,
      email: user.email
    });

    console.log('User signed up, profile updated, and data saved:', user);
    return user; // Return the user object
  } catch (error) {
    console.error('Error signing up:', error);
    throw error; // Re-throw the error for handling in the caller
  }
};

// Email/Password Sign-In
export const signInWithEmail = (email, password) => {
  return signInWithEmailAndPassword(auth, email, password)
    .then((userCredential) => {
      console.log('User signed in:', userCredential.user);
      return userCredential.user;
    })
    .catch((error) => {
      console.error(error);
      throw error;
    });
};

// Google Sign-In function...

export const signOutUser = () => {
    return signOut(auth)
      .then(() => {
        console.log('User signed out');
      })
      .catch((error) => {
        console.error('Error signing out:', error);
        throw error;
      });
  };

export const createGameRoom = async (name) => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');

    const newGameRoom = {
      name: name || `Game Room ${Date.now()}`, // Use provided name or generate a default one
      createdByUserName: user.displayName,
      createdAt: new Date(),
      players: [], // Initialize with an empty list of players
    };

    const docRef = await addDoc(collection(db, 'gameRooms'), newGameRoom);
    return { id: docRef.id, ...newGameRoom };
  } catch (error) {
    console.error('Error creating game room:', error);
    throw error;
  }
};
  
export const fetchGameRooms = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, 'gameRooms'));
    const gameRooms = [];
    querySnapshot.forEach((doc) => {
      gameRooms.push({ id: doc.id, ...doc.data() });
    });
    return gameRooms;
  } catch (error) {
    console.error('Error fetching game rooms:', error);
    throw error;
  }
};
  // Export Firestore and Auth
  export { db, auth };