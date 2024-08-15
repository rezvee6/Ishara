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

  export const createGame = async (gameName) => {
    try {
      const auth = getAuth();
      const user = auth.currentUser;
  
      if (!user) {
        throw new Error("User must be signed in to create a game.");
      }
  
      // Default username to 'Anonymous' if displayName is not set
      const username = user.displayName || 'Anonymous';
  
      // Create a new game document in Firestore
      const docRef = await addDoc(collection(db, 'games'), {
        name: gameName,
        players: [{
          uid: user.uid,
          username: username,
          role: '' // Placeholder for role assignment later
        }],
        createdAt: new Date(),
        gameStarted: false // Add a flag to indicate if the game has started
      });
  
      return docRef.id; // Return the game ID
    } catch (error) {
      console.error("Error creating game:", error);
      throw error;
    }
  };

  
  // Function to get available games
  export const getAvailableGames = async () => {
    try {
      const q = query(collection(db, "games"));
      const querySnapshot = await getDocs(q);
      const games = [];
      querySnapshot.forEach((doc) => {
        games.push({ id: doc.id, ...doc.data() });
      });
      return games;
    } catch (error) {
      console.error("Error getting documents: ", error);
      throw error;
    }
  };
  
  // Function to join a game
// firebaseConfig.js
export const joinGame = async (gameId) => {
  try {
    const auth = getAuth();
    const user = auth.currentUser;

    // Check if the user is authenticated
    if (!user) {
      throw new Error("User must be signed in");
    }

    // Ensure user ID is available
    if (!user.uid) {
      throw new Error("User ID is missing");
    }

    const gameRef = doc(db, 'games', gameId);
    const gameDoc = await getDoc(gameRef);

    // Check if the game document exists
    if (!gameDoc.exists()) {
      throw new Error("Game not found");
    }

    const gameData = gameDoc.data();

    // Ensure `players` field is an array
    if (!Array.isArray(gameData.players)) {
      throw new Error("Players field is not an array");
    }

    // Check if the user is already in the game
    const userAlreadyInGame = gameData.players.some(player => player.uid === user.uid);
    if (userAlreadyInGame) {
      console.log("User is already in the game");
      return; // User is already in the game
    }

    // Check if the game is full
    if (gameData.players.length >= 10) {
      throw new Error("Game is full");
    }

    // Add the user to the game
    const newPlayer = {
      uid: user.uid,
      username: user.displayName || 'Anonymous',
      role: '' // Placeholder for role assignment later
    };

    // Ensure `players` field is updated correctly
    const updatedPlayers = [...gameData.players, newPlayer];

    // Debugging: Log the updated players array and game data
    console.log('Game Data:', gameData);
    console.log('Updated Players Array:', updatedPlayers);

    // Update Firestore document
    await updateDoc(gameRef, {
      players: updatedPlayers
    });

    console.log("User added to game");

  } catch (error) {
    console.error("Error joining game:", error);
    throw error; // Rethrow to handle further up the call stack if needed
  }
};

export const leaveGame = async (gameId, userId) => {
  try {
    const gameRef = doc(db, "games", gameId);
    const gameDoc = await getDoc(gameRef);
    
    if (!gameDoc.exists()) {
      throw new Error('Game not found');
    }
    
    const gameData = gameDoc.data();
    console.log('Current game data:', gameData); // Debugging line
    
    if (!gameData.players.some(player => player.uid === userId)) {
      console.log('User is not in the game'); // Debugging line
      return; // Exit if the user is not in the game
    }
    
    const updatedPlayers = gameData.players.filter(player => player.uid !== userId);
    const updatedRoles = { ...gameData.roles };
    delete updatedRoles[userId]; // Remove the user's role
    
    console.log('Updated players list:', updatedPlayers); // Debugging line
    console.log('Updated roles:', updatedRoles); // Debugging line
    
    await updateDoc(gameRef, {
      players: updatedPlayers,
      roles: updatedRoles // Remove the user's role from the roles object
    });
    
    // Fetch the document again to verify the update
    const updatedGameDoc = await getDoc(gameRef);
    const updatedGameData = updatedGameDoc.data();
    console.log('Updated game data:', updatedGameData); // Debugging line
    
    console.log('User successfully left the game'); // Debugging line
  } catch (error) {
    console.error('Error leaving game:', error);
    throw error;
  }
};

  export const startGame = async (gameId, players) => {
    try {
      // Shuffle players array
      const shuffledPlayers = players.sort(() => Math.random() - 0.5);
  
      // Assign roles
      const roles = shuffledPlayers.map((player, index) => ({
        ...player,
        role: index === 0 ? 'killer' : 'player' // First player is the killer, others are players
      }));
  
      // Update the game document with roles
      const gameRef = doc(db, 'games', gameId);
      await updateDoc(gameRef, {
        status: 'started', // Indicate the game has started
        roles: roles
      });
  
      console.log('Game started and roles assigned:', roles);
    } catch (error) {
      console.error('Error starting the game:', error);
      throw error;
    }
  };

  export const SubmitGuess = async (gameId, userId, guess) => {
    try {
      const gameRef = doc(db, 'games', gameId);
      const gameDoc = await getDoc(gameRef);
  
      if (gameDoc.exists()) {
        const gameData = gameDoc.data();
  
        // Update the guess for the current user
        const updatedRoles = { ...gameData.roles };
        updatedRoles[userId].guess = guess;
  
        await updateDoc(gameRef, {
          roles: updatedRoles
        });
  
        console.log('Guess submitted successfully');
      } else {
        console.error('Game not found');
      }
    } catch (error) {
      console.error('Error submitting guess:', error);
    }
  };
  
  // Export Firestore and Auth
  export { db, auth };