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
		<div id="lobby-form">
			{/* <Anime transformX={50}>
			<img src="emoji_laugh.png"></img>
			</Anime> */}
			<form onSubmit={handleSubmit}>
				<h1>QUIPLASH</h1>
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
	)
};

export default Lobby;
