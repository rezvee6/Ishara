// components/GameRoom.js
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getDoc, doc, updateDoc, onSnapshot } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { db, signOutUser } from "../firebaseConfig"; // Ensure proper imports

const GameRoom = () => {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const [game, setGame] = useState(null);
  const [user, setUser] = useState(null);
  const [guess, setGuess] = useState("");
  const [gameOver, setGameOver] = useState(false);
  const [killerRevealed, setKillerRevealed] = useState(false);
  const [revealWinner, setRevealWinner] = useState(false);
  const auth = getAuth();

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, "games", gameId), (gameDoc) => {
      if (gameDoc.exists()) {
        const gameData = gameDoc.data();
        setGame(gameData);

        // Check if all players have guessed
        const allPlayersGuessed = Object.values(gameData.roles || {}).every(
          (role) => role.guess
        );
        if (allPlayersGuessed) {
          setGameOver(true);
          setRevealWinner(true);
        } else {
          setGameOver(false);
          setRevealWinner(false);
        }
      } else {
        console.log("Game not found");
      }
    });

    // Fetch the current user
    const fetchUser = async () => {
      try {
        const currentUser = auth.currentUser;
        if (currentUser) {
          setUser(currentUser);
        } else {
          console.log("No user is signed in");
        }
      } catch (error) {
        console.error("Error fetching user:", error);
      }
    };

    fetchUser();

    // Clean up the listener on component unmount
    return () => unsubscribe();
  }, [gameId, auth]);

  const handleGuessSubmit = async (e) => {
    e.preventDefault();
    if (user && guess && game && game.roles) {
      if (game.roles[user.uid]?.guess) {
        alert("You have already made a guess!");
        return;
      }

      try {
        const gameRef = doc(db, "games", gameId);
        const updatedRoles = { ...game.roles };
        updatedRoles[user.uid] = { ...updatedRoles[user.uid], guess };

        await updateDoc(gameRef, {
          roles: updatedRoles,
        });

        // Check if all players have guessed
        const allPlayersGuessed = Object.values(updatedRoles).every(
          (role) => role.guess
        );
        if (allPlayersGuessed) {
          setRevealWinner(true); // Show the reveal winner button
        }

        setGuess(""); // Clear the input after submission
      } catch (error) {
        console.error("Error submitting guess:", error);
      }
    }
  };

  const handleStartNewRound = async () => {
    try {
      if (game && game.roles) {
        // Reset game state for a new round
        const newRoles = Object.fromEntries(
          Object.entries(game.roles).map(([uid, role]) => [
            uid,
            { ...role, guess: "" },
          ])
        );

        const gameRef = doc(db, "games", gameId);
        await updateDoc(gameRef, {
          roles: newRoles,
          gameOver: false,
          gameStarted: true,
        });

        // Optionally reassign roles for the new round
        await assignRoles();

        // Calculate points only after roles are reassigned
        calculatePoints();

        setGame({ ...game, roles: newRoles });
        setGameOver(false);
        setKillerRevealed(false);
        setRevealWinner(false);
        console.log("New round started and points calculated");
      }
    } catch (error) {
      console.error("Error starting new round:", error);
    }
  };

  const calculatePoints = async () => {
    if (!game || !game.roles || !game.players) {
      console.error("Game data, roles, or players are not available");
      return;
    }

    let killerUsername = null;

    // Identify the killer's username
    for (const player of game.players) {
      if (game.roles[player.uid]?.role === "killer") {
        killerUsername = player.username;
        break;
      }
    }

    if (!killerUsername) {
      console.error("Killer was not found");
      return;
    }

    console.log("Killer Username:", killerUsername);

    try {
      // Prepare the updates for Firestore
      const updates = {};
      for (const [uid, role] of Object.entries(game.roles)) {
        if (
          role.guess &&
          role.guess.trim().toLowerCase() ===
            killerUsername.trim().toLowerCase()
        ) {
          // Increment the points for the correct guess
          updates[`roles.${uid}.points`] = (role.points || 0) + 1;
        }
      }

      console.log("Updates to be made:", updates);

      // Update Firestore with the calculated points
      const gameRef = doc(db, "games", gameId);
      await updateDoc(gameRef, updates);

      // Update local state with the new roles
      setGame((prevGame) => ({
        ...prevGame,
        roles: {
          ...prevGame.roles,
          ...Object.fromEntries(
            Object.entries(updates).map(([key, value]) => {
              const uid = key.split(".")[1];
              return [uid, { ...prevGame.roles[uid], points: value }];
            })
          ),
        },
      }));

      console.log("Points calculated and updated");
    } catch (error) {
      console.error("Error updating points:", error);
    }
  };

  const assignRoles = async () => {
    if (!game || !game.players) {
      console.error("Game or players data is not available");
      return;
    }

    const shuffledPlayers = [...game.players].sort(() => Math.random() - 0.5);
    const newRoles = {};

    // Assign one killer and the rest as players
    for (let i = 0; i < shuffledPlayers.length; i++) {
      const playerUid = shuffledPlayers[i].uid;
      newRoles[shuffledPlayers[i].uid] = {
        role: i === 0 ? "killer" : "player",
        username: shuffledPlayers[i].username || "Unnamed Player",
        guess: "",
        points: game.roles?.[playerUid]?.points || 0, // Preserve existing points or default to
      };
    }

    try {
      const gameRef = doc(db, "games", gameId);
      await updateDoc(gameRef, {
        roles: newRoles,
        gameStarted: true,
      });

      setGame((prevGame) => ({
        ...prevGame,
        roles: newRoles,
      }));

      console.log("Roles assigned and game started");
    } catch (error) {
      console.error("Error assigning roles:", error);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOutUser();
      navigate("/"); //
    } catch (error) {
      console.error("Error during sign out:", error);
    }
  };

  const handleNewGame = async () => {
    if (!game || !game.players) {
      console.error("Game or players data is not available");
      return;
    }

    const shuffledPlayers = [...game.players].sort(() => Math.random() - 0.5);
    const newRoles = {};

    // Assign one killer and the rest as players
    for (let i = 0; i < shuffledPlayers.length; i++) {
      const playerUid = shuffledPlayers[i].uid;
      newRoles[shuffledPlayers[i].uid] = {
        role: i === 0 ? "killer" : "player",
        username: shuffledPlayers[i].username || "Unnamed Player",
        guess: "",
        points: 0,
      };
    }

    try {
      const gameRef = doc(db, "games", gameId);
      await updateDoc(gameRef, {
        roles: newRoles,
        gameStarted: true,
      });

      setGame((prevGame) => ({
        ...prevGame,
        roles: newRoles,
      }));

      console.log("Roles assigned and game started");
    } catch (error) {
      console.error("Error assigning roles:", error);
    }
  };

  return (
    <div>
      <h1>Game Room</h1>
      <button onClick={handleSignOut}>Sign Out</button>
      <h2>Game Status:</h2>
      {game ? (
        <div>
          <ul>
            {game.players?.length > 0 ? (
              game.players.map((player) => {
                const { uid, username } = player || {};
                const role = game.roles?.[uid] || {};
                const guess = role.guess ?? "";
                const points = role.points ?? 0;
                const isCurrentUser = uid === user?.uid;
                const isKiller = isCurrentUser && role.role === "killer"; // Only show 'Killer' to the current user if they are the killer
                const canGuess = !gameOver && !role.guess;

                return (
                  <li key={uid}>
                    {username || "Unnamed Player"}
                    {isCurrentUser ? " (You)" : ""}
                    {isKiller ? " (Killer)" : ""}
                    {guess ? ` - guessed` : canGuess ? " - Awaiting guess" : ""}
                    {points !== undefined ? ` - Points: ${points}` : ""}
                  </li>
                );
              })
            ) : (
              <li>No players available.</li>
            )}
          </ul>

          {!gameOver && !revealWinner && (
            <form onSubmit={handleGuessSubmit}>
              <label>
                Guess the Killer:
                <input
                  type="text"
                  value={guess}
                  onChange={(e) => setGuess(e.target.value)}
                />
              </label>
              <button type="submit">Submit Guess</button>
            </form>
          )}

          {revealWinner && (
            <div>
              <h3>Killer Revealed!</h3>
              {/* Find the killer role and safely access the username */}
              {game && game.roles && game.players ? (
                <>
                  {Object.entries(game.roles).find(
                    ([uid, role]) => role.role === "killer"
                  ) ? (
                    <p>
                      The killer was:{" "}
                      {game.players.find(
                        (p) =>
                          p.uid ===
                          Object.entries(game.roles).find(
                            ([uid, role]) => role.role === "killer"
                          )[0]
                      )?.username || "Unknown"}
                    </p>
                  ) : (
                    <p>Killer not found</p>
                  )}
                </>
              ) : (
                <p>Loading...</p>
              )}
            </div>
          )}

          {gameOver && (
            <button onClick={handleStartNewRound}>Start New Round</button>
          )}

          {gameOver && <button onClick={handleNewGame}>Start New Game</button>}
        </div>
      ) : (
        <p>Loading game data...</p>
      )}
    </div>
  );
};

export default GameRoom;
