import React from 'react';

const Lobby = ({
	name,
	handleNameChange,
	roomCode,
	handleRoomCodeChange,
	handleSubmit,
}) => {
	return (
		<form onSubmit={handleSubmit}>
			<h1>Test app</h1>
			<input
				type="text"
				id="name"
				value={name}
				onChange={handleNameChange}
				placeholder="Name"
			/>
			<input
				type="text"
				id="roomCode"
				value={roomCode}
				onChange={handleRoomCodeChange}
				maxLength={4}
				placeholder="Code"
				required
			/>
      <button type="submit">Join</button>
		</form>
	)
};

export default Lobby;
