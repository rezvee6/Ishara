// App.js
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Home from './components/Home';

import Auth from './components/Auth';

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<Auth />} />
      <Route path="/home" element={<Home />} />
    </Routes>
  );
};

export default App;
