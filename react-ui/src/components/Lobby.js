import React from 'react';
import Anime, { anime } from 'react-anime';

const Lobby = ({
	name,
	handleNameChange,
	roomCode,
	handleRoomCodeChange,
	handleSubmit,
}) => {
	return (
		<div id="lobby">
			
			<div id = "start">
			<img src= {require("./hilarious.png")}></img>
			</div>
			<div id = "lobby-form">
			<form onSubmit={handleSubmit}>
				<input
					type="text"
					id="name"
					value={name}
					onChange={handleNameChange}
					placeholder="Name"
					autoComplete="off"
					required
				/>
				<input
					type="text"
					id="roomCode"
					value={roomCode}
					onChange={handleRoomCodeChange}
					maxLength={4}
					placeholder="Code"
					autoComplete="off"
					required
				/>
				<button type="submit">Join</button>
			</form>
			</div>
		</div>
	)
};

export default Lobby;
