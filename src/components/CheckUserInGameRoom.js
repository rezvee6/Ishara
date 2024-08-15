import { useEffect, useState } from 'react';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';

const useCheckUserInGameRoom = () => {
  const db = getFirestore();
  const auth = getAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true); // Add loading state

  useEffect(() => {
    const checkAndRedirectUserToGameRoom = async (user) => {
      if (user) {
        const userDisplayName = user.displayName;
        const gameRoomsCollection = collection(db, 'gameRooms');
        const querySnapshot = await getDocs(gameRoomsCollection);

        for (const doc of querySnapshot.docs) {
          const data = doc.data();

          let userFound = false;
          if (data.players) {
            for (const player of data.players) {
              if (player.displayName === userDisplayName) {
                userFound = true;
                break;
              }
            }
          }

          if (userFound) {
            console.log(`Redirecting ${userDisplayName} to game room: ${doc.id}`);
            navigate(`/game/${doc.id}`); // Redirect to the game room
            return; // Exit the loop after redirecting
          } else {
            console.log(`${userDisplayName} not found in game room: ${doc.id}`);
          }
        }
      } else {
        console.log('No authenticated user found.');
      }
      setLoading(false); // Set loading to false after processing
    };

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        checkAndRedirectUserToGameRoom(user);
      } else {
        setLoading(false); // Set loading to false if no user is authenticated
      }
    });

    return () => unsubscribe();
  }, [db, auth, navigate]);

  if (loading) {
    return <div>Loading...</div>; // Display loading indicator
  }

  return null; // Return null if not loading
};

export default useCheckUserInGameRoom;