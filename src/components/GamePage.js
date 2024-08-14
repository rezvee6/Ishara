import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getDoc, doc, updateDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { db, signOutUser } from '../firebaseConfig'; // Ensure proper imports

const GamePage = () => {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const [game, setGame] = useState(null);
  const [user, setUser] = useState(null);
  const [guess, setGuess] = useState('');
  const [players, setPlayers] = useState([]);
  const auth = getAuth();

  useEffect(() => {
    // Fetch game data and current user
    const fetchGame = async () => {
      try {
        const gameDoc = await getDoc(doc(db, 'games', gameId));
        if (gameDoc.exists()) {
          const gameData = gameDoc.data();
          console.log('Fetched game data:', gameData); // Debugging line
          setGame(gameData);
        } else {
          console.log('Game not found');
        }
      } catch (error) {
        console.error('Error fetching game:', error);
      }
    };

    // Fetch the current user
    const fetchUser = async () => {
      try {
        const currentUser = auth.currentUser;
        if (currentUser) {
          setUser(currentUser);
          console.log('Current user:', currentUser); // Debugging line
        } else {
          console.log('No user is signed in');
        }
      } catch (error) {
        console.error('Error fetching user:', error);
      }
    };

    fetchGame();
    fetchUser();
  }, [gameId, auth]);

  // Function to handle sign-out
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
      <h1>Game Page</h1>
      <button onClick={handleSignOut}>Sign Out</button>
      <h2>Game Status:</h2>
      {game ? (
        <div>
          <ul>
          {players.map((player, index) => (
                <li key={index}>
                  {player.username || 'Unnamed Player'} {player.uid === user.uid ? '(You)' : ''}
                </li>
              ))}
          </ul>

          {/* Assuming the game has a "killer" property or something to indicate the game is ongoing */}
       
        </div>
      ) : (
        <p>Loading game data...</p>
      )}
    </div>
  );
};

export default GamePage;
