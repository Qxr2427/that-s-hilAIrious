import React, { useState, useCallback } from 'react';
import Lobby from './components/Lobby'
import Room from './components/Room'
import { io } from 'socket.io-client';
import './App.css';

const socket = io('/');

const App = () => {
	const [name, setName] = useState('');
	const [roomCode, setRoomCode] = useState('');
	const [token, setToken] = useState('');

	const handleNameChange = useCallback(event => setName(event.target.value), []);
	const handleRoomCodeChange = useCallback(event => setRoomCode(event.target.value.toUpperCase()), []);

	const handleSubmit = useCallback(async event => {
		event.preventDefault();
		const data = await fetch('/token', {
			method: 'POST',
			body: JSON.stringify({
				name,
				roomCode,
			}),
			headers: {
				'Content-Type': 'application/json'
			}
		}).then(res => res.json());
		setToken(data.token);
	}, [name, roomCode]);

	const handleLogout = useCallback(event => {
		setToken(null);
	}, []);

	window.addEventListener("beforeunload", handleLogout);

	return (
		<div className="app">
			<main>
				{token ? (
					<Room socket={socket} roomCode={roomCode} token={token} handleLogout={handleLogout} />
				):(
					<Lobby
						name={name}
						roomCode={roomCode}
						handleNameChange={handleNameChange}
						handleRoomCodeChange={handleRoomCodeChange}
						handleSubmit={handleSubmit}
					/>
				)}
			</main>
		</div>
	)
}

export default App;
