// components/GameRoom.js
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getDoc, doc, updateDoc, onSnapshot } from 'firebase/firestore';
import { getAuth ,onAuthStateChanged } from 'firebase/auth';
import { db, leaveGame, signOutUser } from '../firebaseConfig'; // Ensure proper imports

const GameRoom = () => {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const [game, setGame] = useState(null);
  const [user, setUser] = useState(null);
  const [guess, setGuess] = useState('');
  const [gameOver, setGameOver] = useState(false);
  const [killerRevealed, setKillerRevealed] = useState(false);
  const [revealWinner, setRevealWinner] = useState(false);

  const auth = getAuth();

  useEffect(() => {
    // Listen for auth state changes
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      } else {
        console.log('No user is signed in');
        navigate('/login'); // Optionally redirect to a login page
      }
    });

    // Clean up the subscription on component unmount
    return () => unsubscribeAuth();
  }, [auth, navigate]);

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'games', gameId), (gameDoc) => {
      if (gameDoc.exists()) {
        const gameData = gameDoc.data();
        setGame(gameData);

        // Check if all players have guessed
        const allPlayersGuessed = Object.values(gameData.roles || {}).every(role => role.guess);
        if (allPlayersGuessed) {
          setGameOver(true);
          setRevealWinner(true);
        } else {
          setGameOver(false);
          setRevealWinner(false);
        }
      } else {
        console.log('Game not found');
      }
    });

    // Fetch the current user
    const fetchUser = async () => {
      try {
        const currentUser = auth.currentUser;
        if (currentUser) {
          setUser(currentUser);
        } else {
          console.log('No user is signed in');
        }
      } catch (error) {
        console.error('Error fetching user:', error);
      }
    };

    fetchUser();

    // Clean up the listener on component unmount
    return () => unsubscribe();
  }, [gameId, auth]);

  const handleGuessSubmit = async (e) => {
    e.preventDefault();
  
    if (!user || !guess || !game || !game.roles) {
      console.error("Missing data for submitting a guess.");
      return;
    }
  
    const userId = user.uid;
    
    // Check if the user has already guessed
    if (game.roles[userId]?.guess) {
      alert('You have already made a guess!');
      return;
    }
  
    try {
      const gameRef = doc(db, 'games', gameId);
  
      // Update only the current user's guess in the roles object
      const updatedRoles = { 
        ...game.roles,
        [userId]: { 
          ...game.roles[userId], 
          guess 
        }
      };
  
      // Update the game document with the new guess
      await updateDoc(gameRef, {
        [`roles.${userId}.guess`]: guess
      });
  
      // Check if all players have guessed
      const allPlayersGuessed = Object.values(updatedRoles).every(role => role.guess);
      if (allPlayersGuessed) {
        setRevealWinner(true); // Show the reveal winner button
      }
  
      setGuess(''); // Clear the input after submission
    } catch (error) {
      console.error('Error submitting guess:', error);
    }
  };
  

  const handleStartNewRound = async () => {
    try {
      if (game && game.roles) {
        // Reset game state for a new round
        const newRoles = Object.fromEntries(
          Object.entries(game.roles).map(([uid, role]) => [uid, { ...role, guess: '' }])
        );
  
        const gameRef = doc(db, 'games', gameId);
        await updateDoc(gameRef, {
          roles: newRoles,
          gameOver: false,
          gameStarted: true
        });
  
        // Optionally reassign roles for the new round
        await assignRoles();
  
        // Calculate points only after roles are reassigned
        calculatePoints(); 
  
        setGame({ ...game, roles: newRoles });
        setGameOver(false);
        setKillerRevealed(false);
        setRevealWinner(false);
        console.log('New round started and points calculated');
      }
    } catch (error) {
      console.error('Error starting new round:', error);
    }
  };
  
  const calculatePoints = async () => {
    if (!game || !game.roles || !game.players) {
      console.error('Game data, roles, or players are not available');
      return;
    }
  
    let killerUsername = null;
  
    // Identify the killer's username
    for (const player of game.players) {
      if (game.roles[player.uid]?.role === 'killer') {
        killerUsername = player.username;
        break;
      }
    }
  
    if (!killerUsername) {
      console.error('Killer was not found');
      return;
    }
  
    console.log('Killer Username:', killerUsername);
  
    try {
      // Prepare the updates for Firestore
      const updates = {};
      for (const [uid, role] of Object.entries(game.roles)) {
        if (role.guess && role.guess.trim().toLowerCase() === killerUsername.trim().toLowerCase()) {
          // Increment the points for the correct guess
          updates[`roles.${uid}.points`] = (role.points || 0) + 1;
        }
      }
  
      console.log('Updates to be made:', updates);
  
      // Update Firestore with the calculated points
      const gameRef = doc(db, 'games', gameId);
      await updateDoc(gameRef, updates);
  
      // Update local state with the new roles
      setGame(prevGame => ({
        ...prevGame,
        roles: {
          ...prevGame.roles,
          ...Object.fromEntries(
            Object.entries(updates).map(([key, value]) => {
              const uid = key.split('.')[1];
              return [uid, { ...prevGame.roles[uid], points: value }];
            })
          )
        }
      }));
  
      console.log('Points calculated and updated');
    } catch (error) {
      console.error('Error updating points:', error);
    }
  };

  const assignRoles = async () => {
    if (!game || !game.players) {
      console.error('Game or players data is not available');
      return;
    }

    const shuffledPlayers = [...game.players].sort(() => Math.random() - 0.5);
    const newRoles = {};

    // Assign one killer and the rest as players
    for (let i = 0; i < shuffledPlayers.length; i++) {
      const playerUid = shuffledPlayers[i].uid;
      newRoles[shuffledPlayers[i].uid] = {
        role: i === 0 ? 'killer' : 'player',
        username: shuffledPlayers[i].username || 'Unnamed Player',
        guess: '',
        points: game.roles?.[playerUid]?.points || 0 // Preserve existing points or default to 
      };
    }

    try {
      const gameRef = doc(db, 'games', gameId);
      await updateDoc(gameRef, {
        roles: newRoles,
        gameStarted: true
      });

      setGame((prevGame) => ({
        ...prevGame,
        roles: newRoles
      }));

      console.log('Roles assigned and game started');
    } catch (error) {
      console.error('Error assigning roles:', error);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOutUser();
      navigate('/'); //

      
    } catch (error) {
      console.error('Error during sign out:', error);
    }
  };

  const handleNewGame = async () => {
    if (!game || !game.players) {
      console.error('Game or players data is not available');
      return;
    }

    const shuffledPlayers = [...game.players].sort(() => Math.random() - 0.5);
    const newRoles = {};

    // Assign one killer and the rest as players
    for (let i = 0; i < shuffledPlayers.length; i++) {
      const playerUid = shuffledPlayers[i].uid;
      newRoles[shuffledPlayers[i].uid] = {
        role: i === 0 ? 'killer' : 'player',
        username: shuffledPlayers[i].username || 'Unnamed Player',
        guess: '',
        points: 0
      };
    }

    try {
      const gameRef = doc(db, 'games', gameId);
      await updateDoc(gameRef, {
        roles: newRoles,
        gameStarted: true
      });

      setGame((prevGame) => ({
        ...prevGame,
        roles: newRoles
      }));

      console.log('Roles assigned and game started');
      setGameOver(false);
      setKillerRevealed(false);
      setRevealWinner(false);

    } catch (error) {
      console.error('Error assigning roles:', error);
    }
};

const handleLeaveGame = async () => {
  if (user && gameId) {
    try {
      await leaveGame(gameId, user.uid);
      console.log('User has left the game successfully');
      // Optionally, redirect the user or update state
      navigate('/'); // Navigate to a different page or the main screen after leaving
    } catch (error) {
      console.error('Error leaving game:', error);
      // Optionally, show an error message to the user
      alert('An error occurred while leaving the game. Please try again.');
    }
  } else {
    console.error('User or gameId is missing');
    // Optionally, show an error message if user or gameId is not available
  }
};

  return (
    <div>
      <h1>Game Room</h1>
      <button onClick={handleSignOut}>Sign Out</button>
      <h2>Game Status:</h2>
{game ? (
  <div>
    <ul>
      {game.players?.length > 0 ? (
        game.players.map((player) => {
          // Ensure the player object and roles are defined
          const { uid, username } = player || {};
          const role = game.roles?.[uid] || {};
          const guess = role.guess ?? '';
          const points = role.points ?? 0;
          const isCurrentUser = uid === user?.uid;
          const canGuess = !gameOver && !role.guess; // Determine if player can guess

          return (
            <li key={uid}>
              {username || 'Unnamed Player'} {isCurrentUser ? '(You)' : ''}
              {guess ? ` - guessed` : canGuess ? ' - Awaiting guess' : ''}
              {points !== undefined ? ` - Points: ${points}` : ''}
            </li>
          );
        })
      ) : (
        <li>No players available.</li>
      )}
    </ul>

          {!gameOver && !revealWinner && (
            <form onSubmit={handleGuessSubmit}>
              <label>
                Guess the Killer:
                <input
                  type="text"
                  value={guess}
                  onChange={(e) => setGuess(e.target.value)}
                />
              </label>
              <button type="submit">Submit Guess</button>
            </form>
          )}

          {revealWinner && game.players && game.roles && (
            <div>
              <h3>Killer Revealed!</h3>
              {(() => {
                const killerUid = Object.keys(game.roles).find(uid => game.roles[uid].role === 'killer');
                const killer = game.players.find(p => p.uid === killerUid);

                return killer ? (
                  <p>The killer was: {killer.username}</p>
                ) : (
                  <p>No killer found or data is still loading...</p>
                );
              })()}
            </div>
          )}


          {gameOver && (
            <button onClick={handleStartNewRound}>Start New Round</button>
          )}
          <li></li>
          <li></li>
          <li></li>
          {gameOver && (
            <button onClick={handleNewGame}>Start New Game</button>
          )}
           {gameOver && (
            <button onClick={handleLeaveGame}>Leave Game</button>
          )}
        </div>
      ) : (
        <p>Loading game data...</p>
      )}
    </div>
  );
};

export default GameRoom;
