import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getFirestore, doc, onSnapshot } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { leaveGameRoom } from '../firebaseConfig';

const Game = () => {
  const { gameRoomId } = useParams();
  const [gameRoom, setGameRoom] = useState(null);
  const db = getFirestore();
  const auth = getAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const gameRoomRef = doc(db, 'gameRooms', gameRoomId);

    const unsubscribe = onSnapshot(gameRoomRef, (gameRoomSnap) => {
      if (gameRoomSnap.exists()) {
        setGameRoom(gameRoomSnap.data());
      } else {
        console.log('No such game room!');
      }
    }, (error) => {
      console.error('Error fetching game room:', error);
    });

    return () => unsubscribe();
  }, [db, gameRoomId]);


  const handleLeaveGameRoom = async () => {
    try {
      const user = auth.currentUser;
      const displayName = user.displayName || user.email;
      await leaveGameRoom(gameRoomId, displayName);
      navigate('/');
    } catch (error) {
      console.error('Error leaving game room:', error);
    }
  };

  if (!gameRoom) {
    return <p>Loading game room...</p>;
  }

  return (
    <div>
      <h1>Game Room: {gameRoom.name}</h1>
      <p>Created by: {gameRoom.createdByUserName}</p>
      <h2>Players</h2>
      <ul>
        {gameRoom.players.map((player, index) => (
          <li key={index}>
            {player.displayName} - Points: {player.points}
          </li>
        ))}
      </ul>
      <button onClick={handleLeaveGameRoom}>Leave Game Room</button>
    </div>
  );
};

export default Game;