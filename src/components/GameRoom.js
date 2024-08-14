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
          setKillerRevealed(true);
        } else {
          setGameOver(false);
          setKillerRevealed(false);
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
          await assignPoints(updatedRoles);
          setGameOver(true);
          setKillerRevealed(true);
        }

        setGuess(''); // Clear the input after submission
      } catch (error) {
        console.error('Error submitting guess:', error);
      }
    }
  };

  const assignPoints = async (roles) => {
    let killerUid = null;
    let updatedRoles = { ...roles };

    // Identify the killer
    for (const [uid, role] of Object.entries(roles)) {
      if (role.role === 'killer') {
        killerUid = uid;
        break;
      }
    }

    // Assign points
    for (const [uid, role] of Object.entries(roles)) {
      if (role.guess === killerUid) {
        updatedRoles[uid].points = (role.points || 0) + 1; // Award 1 point for correct guess
      } else {
        updatedRoles[uid].points = role.points || 0;
      }
    }

    try {
      const gameRef = doc(db, 'games', gameId);
      await updateDoc(gameRef, {
        roles: updatedRoles
      });

      setGame({ ...game, roles: updatedRoles });
    } catch (error) {
      console.error('Error updating points:', error);
    }
  };

  const handleStartNewRound = async () => {
    try {
      if (game && game.roles) {
        // Reset game state for a new round
        const newRoles = Object.fromEntries(
          Object.entries(game.roles).map(([uid, role]) => [uid, { ...role, guess: '', points: 0 }])
        );

        const gameRef = doc(db, 'games', gameId);
        await updateDoc(gameRef, {
          roles: newRoles,
          gameOver: false,
          gameStarted: true // If the game was not started yet, you might want to set this to true
        });

        setGame({ ...game, roles: newRoles });
        setGameOver(false);
        setKillerRevealed(false);
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
                {gameOver && game.roles[player.uid]?.points !== undefined ? ` - Points: ${game.roles[player.uid].points}` : ''}
              </li>
            ))}
          </ul>

          {!gameOver && (
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

          {killerRevealed && (
            <div>
              <h3>Killer Revealed!</h3>
              <p>The killer was: {game.players.find(p => p.uid === Object.keys(game.roles).find(uid => game.roles[uid].role === 'killer')).username}</p>
            </div>
          )}

          {/* Show button to start a new round if the game is over */}
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
