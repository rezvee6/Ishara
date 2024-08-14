// App.js
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Home from './components/Home';
import GameRoom from './components/GameRoom';
import CreateGame from './components/CreateGame';
import GamePage from './components/GamePage';

import Auth from './components/Auth';

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<Auth />} />
      <Route path="/home" element={<Home />} />
      <Route path="/game-room/:gameId" element={<GameRoom />} />
      <Route path="/create-game" element={<CreateGame />} />
      <Route path="/game-room/:gameId" element={<GameRoom />} />
      <Route path="/game/:gameId" element={<GamePage />} /> {/* Add this route */}
    </Routes>
  );
};

export default App;
