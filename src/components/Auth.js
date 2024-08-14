import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithGoogle, auth } from '../firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';
import SignUp from './SignUp';
import SignIn from './SignIn';

const Auth = () => {
  const [isSignUp, setIsSignUp] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if a user is already signed in
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        navigate('/home'); // Redirect to Home if signed in
      }
    });

    return () => unsubscribe(); // Cleanup subscription on unmount
  }, [navigate]);

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
      navigate('/home'); // Redirect after successful Google sign-in
    } catch (error) {
      console.error('Error during Google Sign-In', error);
    }
  };

  return (
    <div>
      <h2>{isSignUp ? 'Sign Up' : 'Sign In'}</h2>
      <button onClick={handleGoogleSignIn}>Sign in with Google</button>
      <hr />
      <button onClick={() => setIsSignUp(!isSignUp)}>
        Switch to {isSignUp ? 'Sign In' : 'Sign Up'}
      </button>
      {isSignUp ? <SignUp /> : <SignIn />}
    </div>
  );
};

export default Auth;
