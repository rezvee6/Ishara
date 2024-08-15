// components/Home.js
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signOutUser, joinGame } from '../firebaseConfig';
import { getAuth, onAuthStateChanged } from 'firebase/auth';

const Home = () => {
  const [games, setGames] = useState([]);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();
  const auth = getAuth();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      } else {
        navigate('/signin');
      }
    });

    return () => unsubscribe();
  }, [auth, navigate]);

  const handleSignOut = async () => {
    try {
      await signOutUser();
      navigate('/'); // Redirect to root page after successful sign-out
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <div>
      <h1>Welcome to the Home Page</h1>
      {user && <p>Hello, {user.displayName || user.email}!</p>}
      <button onClick={handleSignOut}>Sign Out</button>
    </div>
  );
};

export default Home;