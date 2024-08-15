// components/Home.js
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signOutUser, joinGame, createGameRoom, subscribeToGameRooms ,deleteGameRoom, joinGameRoom} from '../firebaseConfig'; // Assuming createGameRoom is defined in firebaseConfig
import { getAuth, onAuthStateChanged } from 'firebase/auth';

const Home = () => {
  const [games, setGames] = useState([]);
  const [user, setUser] = useState(null);
  const [newGameRoomName, setNewGameRoomName] = useState('');
  const navigate = useNavigate();
  const auth = getAuth();

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      } else {
        navigate('/signin');
      }
    });

    // Set up real-time listener for game rooms
    const unsubscribeGameRooms = subscribeToGameRooms(setGames);

    return () => {
      unsubscribeAuth();
      unsubscribeGameRooms();
    };
  }, [auth, navigate]);

  const handleSignOut = async () => {
    try {
      await signOutUser();
      navigate('/'); // Redirect to root page after successful sign-out
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleCreateGameRoom = async () => {
    try {
      const newGameRoom = await createGameRoom(newGameRoomName, user.displayName || user.email);
      setGames([...games, newGameRoom]);
      setNewGameRoomName(''); // Clear the input field after creating the game room
    } catch (error) {
      console.error('Error creating game room:', error);
    }
  };

  const handleDeleteGameRoom = async (gameRoomId) => {
    try {
      await deleteGameRoom(gameRoomId);
      setGames(games.filter(game => game.id !== gameRoomId));
    } catch (error) {
      console.error('Error deleting game room:', error);
    }
  };

  const handleJoinGameRoom = async (gameRoomId) => {
    try {
      await joinGameRoom(gameRoomId, user);
      navigate(`/game/${gameRoomId}`); // Navigate to the game page
    } catch (error) {
      console.error('Error joining game room:', error);
    }
  };

  return (
    <div>
      <h1>Welcome to the Home Page</h1>
      {user && <p>Hello, {user.displayName || user.email}!</p>}
      <button onClick={handleSignOut}>Sign Out</button>
      <hr />
      <h2>Game Rooms</h2>
      {games.length === 0 ? (
        <p>No game rooms available. Create one!</p>
      ) : (
        <ul>
          {games.map((game, index) => (
            <li key={index}>
              {game.name} (Created by: {game.createdByUserName})
              {game.createdByUserName === (user?.displayName || user?.email) && (
                <button onClick={() => handleDeleteGameRoom(game.id)}>Delete</button>
              )}
              <button onClick={() => handleJoinGameRoom(game.id)}>Join</button>
            </li>
          ))}
        </ul>
      )}
      <input
        type="text"
        value={newGameRoomName}
        onChange={(e) => setNewGameRoomName(e.target.value)}
        placeholder="Enter game room name"
      />
      <button onClick={handleCreateGameRoom}>Create Game Room</button>
    </div>
  );
};

export default Home;