// components/GameRoom.js
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getDoc, doc, updateDoc, onSnapshot } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { db, signOutUser } from '../firebaseConfig'; // Ensure proper imports

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
    if (user && guess && game && game.roles) {
      if (game.roles[user.uid]?.guess) {
        alert('You have already made a guess!');
        return;
      }

      try {
        const gameRef = doc(db, 'games', gameId);
        const updatedRoles = { ...game.roles };
        updatedRoles[user.uid] = { ...updatedRoles[user.uid], guess };

        await updateDoc(gameRef, {
          roles: updatedRoles
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
  
    try {
      // Prepare the updates for Firestore
      const updates = {};
      for (const [uid, role] of Object.entries(game.roles)) {
        // Ensure guesses and usernames are compared correctly
        if (role.guess && role.guess.trim().toLowerCase() === killerUsername.trim().toLowerCase()) {
          // Increment points if the guess is correct
          updates[`roles.${uid}.points`] = (role.points || 0) + 1;
        }
      }
  
      // Update Firestore with the calculated points
      const gameRef = doc(db, 'games', gameId);
      await updateDoc(gameRef, updates);
  
      // Update local state with the new roles (optional)
      setGame((prevGame) => {
        const updatedRoles = { ...prevGame.roles };
        Object.entries(updates).forEach(([key, value]) => {
          const uid = key.split('.')[1];
          if (updatedRoles[uid]) {
            updatedRoles[uid] = { ...updatedRoles[uid], points: value };
          }
        });
  
        return {
          ...prevGame,
          roles: updatedRoles
        };
      });
  
      console.log('Points calculated and updated');
    } catch (error) {
      console.error('Error updating points:', error);
    }
  };
  
  
  

  const handleRevealWinner = async () => {
    try {
      console.log("Calculating points");
      await calculatePoints();
      setKillerRevealed(true); // Show the killer after calculating points
    } catch (error) {
      console.error('Error revealing winner:', error);
    }
  };

  const handleStartNewRound = async () => {
    try {
      if (game && game.roles) {
        // Preserve points and reset guesses
        const newRoles = Object.fromEntries(
          Object.entries(game.roles).map(([uid, role]) => [
            uid,
            {
              ...role,
              guess: '', // Reset guess for the new round
              // Keep points as they are
            }
          ])
        );
  
        const gameRef = doc(db, 'games', gameId);
        await updateDoc(gameRef, {
          roles: newRoles,
          gameOver: false,
          // Optionally reset other game state properties as needed
          // gameStarted: true // Uncomment if you want to ensure the game is marked as started
        });
  
        setGame((prevGame) => ({
          ...prevGame,
          roles: newRoles
        }));
        setGameOver(false);
        setKillerRevealed(false);
        setRevealWinner(false);
        console.log('New round started');
      }
    } catch (error) {
      console.error('Error starting new round:', error);
    }
  };
  
  const handleSignOut = async () => {
    try {
      await signOutUser();
      navigate('/'); // Redirect to the Auth page after signing out
    } catch (error) {
      console.error('Error during sign out:', error);
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
            {game.players.map((player, index) => (
              <li key={index}>
                {player.username || 'Unnamed Player'} {player.uid === user.uid ? '(You)' : ''}
                {game.roles && game.roles[player.uid]?.guess ? ' - guessed' : ''}
                {game.roles && game.roles[player.uid]?.points !== undefined ? ` - Points: ${game.roles[player.uid].points}` : ''}
              </li>
            ))}
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

          {revealWinner && !killerRevealed && (
            <button onClick={handleRevealWinner}>Reveal Winner</button>
          )}

          {killerRevealed && (
            <div>
              <h3>Killer Revealed!</h3>
              <p>The killer was: {game.players.find(p => p.uid === Object.keys(game.roles).find(uid => game.roles[uid].role === 'killer')).username}</p>
            </div>
          )}

          {gameOver && (
            <button onClick={handleStartNewRound}>Start New Round</button>
          )}
        </div>
      ) : (
        <p>Loading game data...</p>
      )}
    </div>
  );
};

export default GameRoom;
