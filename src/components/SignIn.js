import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmail } from '../firebaseConfig';


const SignIn = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);
    const navigate = useNavigate(); // Initialize useNavigate
  
    const handleSignIn = async (e) => {
      e.preventDefault();
      setError(null);
      try {
        await signInWithEmail(email, password);
        navigate('/home'); // Redirect to Home page after successful sign-in
      } catch (err) {
        setError(err.message);
      }
    };
  
    return (
      <div>
        <h2>Sign In</h2>
        <form onSubmit={handleSignIn}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button type="submit">Sign In</button>
        </form>
        {error && <p style={{ color: 'red' }}>{error}</p>}
      </div>
    );
  };
  
  export default SignIn;
  