import React, { useState, useEffect, useCallback } from 'react';
import Video from 'twilio-video';
import Player from './Player';

const Room = ({ socket, roomCode, token, handleLogout }) => {
	const [room, setRoom] = useState(null);
	const [players, setPlayers] = useState([]);

	const otherPlayers = players.map(p => <Player key={p.sid} player={p} />);

	const handleStartGame = useCallback(() => {
		socket.emit('start-game', {
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
	}, [roomCode, token]);

	return(
		<div className="room">
			<h2>Room: {roomCode}</h2>
      <button onClick={handleStartGame}>Start Game</button>
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
