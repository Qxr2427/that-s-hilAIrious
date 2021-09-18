import React, { useState, useEffect, useCallback } from 'react';
import Video from 'twilio-video';
import Player from './Player';

const statuses = [
	'before-start',
	'intro',
	'prompt',
	'waiting',
	'reveal',
	'turn-end',
	'game-end',
]

const Room = ({ socket, roomCode, token, handleLogout }) => {
	const [room, setRoom] = useState(null);
	const [players, setPlayers] = useState([]);
	const [status, setStatus] = useState(statuses[0]);
	const [yourTurn, setYourTurn] = useState(false);

	const otherPlayers = players.map(p => <Player key={p.sid} player={p} />);

	const handleStartGame = useCallback(() => {
		socket.emit('start-game', {
			playerSid: room.localParticipant.sid,
			roomSid: room.sid,
		});
	}, [room]);

	const handleSubmitJoke = useCallback(() => {
		socket.emit('reveal-joke', {
			playerSid: room.localParticipant.sid,
			roomSid: room.sid,
		});
	}, [room]);

	const handleNextTurn = useCallback(() => {
		socket.emit('next-turn', {
			playerSid: room.localParticipant.sid,
			roomSid: room.sid,
		});
	}, [room]);

	useEffect(() => {
		const playerJoined = player => setPlayers(prev => [...prev, player]);
		const playerLeft = player => setPlayers(prev => prev.filter(x => x !== player));

		Video.connect(token, { name: roomCode }).then(room => {
			setRoom(room);
			room.on('participantConnected', playerJoined);
			room.on('participantDisconnected', playerLeft);
			room.participants.forEach(playerJoined);

			socket.on('game-started', () => {
				setStatus(statuses[1])
			});
			socket.on('your-turn', () => {
				setStatus(statuses[2]);
				setYourTurn(true);
				socket.emit('my-turn', { playerSid: room.localParticipant.sid });
			});
			socket.on('others-turn', ({ otherSid }) => {
				setStatus(statuses[2]);
				setYourTurn(false);
			});
			socket.on('joke-revealed', () => {
				setStatus(statuses[4]);
			})
			socket.on('turn-finished', () => {
				setStatus(statuses[5]);
			})
			socket.on('game-ended', () => {
				setStatus(statuses[6]);
			})
		});

		return () => {
			setRoom(curRoom => {
				if (curRoom && curRoom.localParticipant.state === 'connected') {
					curRoom.localParticipant.tracks.forEach(trackPublication => {
						trackPublication.track.stop();
					});
					curRoom.disconnect();
					return null;
				} else {
					return curRoom;
				}
			})
		}
	}, [roomCode, token, socket]);

	return(
		<div className="room">
			<h2>Room: {roomCode}</h2>
			<p>{status}</p>
			<p>Your turn? {`${yourTurn}`}</p>
			{status === 'before-start' && <button onClick={handleStartGame}>Start Game</button>}
			{(status === 'prompt' && yourTurn) && ( <div id ="test">
			
			<form onSubmit={handleSubmitJoke}>
			<h1>Test app</h1>
			<input
				type="text"
				id="name"
				placeholder="Name"
			/>
			<input
				type="text"
				id="roomCode"
				value={roomCode}
				maxLength={4}
				placeholder="Code"
				required
			/>
      	<button type="submit">Join</button>
		</form>


			<button onClick={handleSubmitJoke}>Submit prompt</button>



			</div>
			
			)}
			{(status === 'turn-end') && <button onClick={handleNextTurn}>Next turn</button>}
      <button onClick={handleLogout}>Log out</button>
      <div className="this-player">
        {room ? (
					<Player
            key={room.localParticipant.sid}
            player={room.localParticipant}
          />
        ) : (
          ''
        )}
      </div>
      <h3>Remote Participants</h3>
      <div className="remote-participants">{otherPlayers}</div>
		</div>
	)
};

export default Room;
