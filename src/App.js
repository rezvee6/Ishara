// App.js
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Home from './components/Home';
import Game from './components/Game'; // Import the Game component
import Auth from './components/Auth';

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<Auth />} />
      <Route path="/home" element={<Home />} />
      <Route path="/game/:gameRoomId" element={<Game />} />
    </Routes>
  );
};

export default App;
