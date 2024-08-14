// components/Home.js
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signOutUser, getAvailableGames, joinGame } from '../firebaseConfig';
import { getAuth } from 'firebase/auth';

const Home = () => {
  const [games, setGames] = useState([]);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();
  const auth = getAuth();

  useEffect(() => {
    // Check if user is logged in
    const currentUser = auth.currentUser;
    setUser(currentUser);

    if (!currentUser) {
      navigate('/'); // Redirect to login if not authenticated
    } else {
      console.log('User is signed in:', currentUser); // Debugging line
      const fetchGames = async () => {
        try {
          const availableGames = await getAvailableGames();
          setGames(availableGames);
        } catch (error) {
          console.error('Error fetching games:', error);
        }
      };

      fetchGames();
    }
  }, [auth.currentUser, navigate]);

  const handleSignOut = async () => {
    try {
      await signOutUser();
      navigate('/'); // Redirect to the Auth page after signing out
    } catch (error) {
      console.error('Error during sign out:', error);
    }
  };

  const handleCreateGame = () => {
    navigate('/create-game'); // Redirect to the Create Game page
  };

  const handleJoinGame = async (gameId) => {
    try {
      await joinGame(gameId); // Add the user to the game
      navigate(`/game-room/${gameId}`); // Redirect to the Game Room page
    } catch (error) {
      console.error('Error joining game:', error);
      alert('There was an error joining the game. Please try again.');
    }
  };

  return (
    <div>
      <h1>Welcome to the Home Page</h1>
      <button onClick={handleSignOut}>Sign Out</button>
      <button onClick={handleCreateGame}>Create Game</button>
      <h2>Available Game Rooms</h2>
      <ul>
        {games.length > 0 ? (
          games.map((game) => (
            <li key={game.id}>
              <span>{game.name}</span>
              <button onClick={() => handleJoinGame(game.id)}>Join</button>
            </li>
          ))
        ) : (
          <p>No available games at the moment.</p>
        )}
      </ul>
    </div>
  );
};

export default Home;
