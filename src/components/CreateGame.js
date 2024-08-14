// src/components/CreateGame.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createGame } from '../firebaseConfig'; // Import your createGame function
import { getAuth } from 'firebase/auth';

const CreateGame = () => {
  const [gameName, setGameName] = useState('');
  const navigate = useNavigate();

  const handleGameNameChange = (event) => {
    setGameName(event.target.value);
  };

  const handleCreateGame = async (event) => {
    event.preventDefault();
    try {
      const auth = getAuth();
      const user = auth.currentUser;

      if (!user) {
        throw new Error("You must be signed in to create a game.");
      }

      // Call the createGame function to create the game in Firestore
      const gameId = await createGame(gameName);
      console.log("Game created with ID:", gameId);

      // Navigate to the game room
      navigate(`/game-room/${gameId}`);
    } catch (error) {
      console.error('Error creating game:', error);
      alert('Error creating game. Please try again.');
    }
  };

  return (
    <div>
      <h1>Create a New Game</h1>
      <form onSubmit={handleCreateGame}>
        <label>
          Game Name:
          <input
            type="text"
            value={gameName}
            onChange={handleGameNameChange}
            required
          />
        </label>
        <button type="submit">Create Game</button>
      </form>
    </div>
  );
};

export default CreateGame;
