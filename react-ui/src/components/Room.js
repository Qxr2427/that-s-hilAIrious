import React, { useState, useEffect, useCallback } from 'react';
import Video from 'twilio-video';
import Player from './Player';
import * as faceapi from '@vladmandic/face-api';

const statuses = [
	'before-start',
	'intro',
	'prompt',
	'waiting',
	'reveal',
	'turn-end',
	'game-end',
]

var txt;

const prompts = [
	'prompt 1',
	'prompt 2',
	'prompt 3',
	'prompt 4'
]


const Room = ({ socket, roomCode, token, handleLogout }) => {
	const [room, setRoom] = useState(null);
	const [players, setPlayers] = useState([]);
	const [status, setStatus] = useState(statuses[0]);
	const [yourTurn, setYourTurn] = useState(false);
	const [joke, setjoke] = useState('');
	const [prompt, setprompt] = useState('');
	const [numturns, setnumturns] = useState(0);
	const otherPlayers = players.map(p => <Player key={p.sid} player={p} socket={socket} />);

	const handleStartGame = useCallback(() => {
		socket.emit('start-game', {
			playerSid: room.localParticipant.sid,
			roomSid: room.sid,
		});
	}, [room]);

	const handleChange = event => {
		setjoke(event.target.value)
	  };
	const handleSubmitJoke = useCallback((event) => {
		//console.log(state);
		event.preventDefault();
		//console.log(name)
		//alert(`${joke}`)
		socket.emit('reveal-joke', {
			playerSid: room.localParticipant.sid,
			roomSid: room.sid,
			text: joke,
			//num_turns: numturns - 1
			//need to get the form data somehow
		});
		return false;
	}, [room, joke]);

	const handleNextTurn = useCallback(() => {
		socket.emit('next-turn', {
			playerSid: room.localParticipant.sid,
			roomSid: room.sid,
			num_turns: numturns - 1
		});
		console.log("minus one ",numturns-1)
	}, [room,numturns]);

	useEffect(() => {
		const playerJoined = player => setPlayers(prev => [...prev, player]);
		const playerLeft = player => setPlayers(prev => prev.filter(x => x !== player));

		Video.connect(token, { name: roomCode }).then(async room => {
			await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
			await faceapi.nets.faceLandmark68Net.loadFromUri('/models');
			await faceapi.nets.faceRecognitionNet.loadFromUri('/models');
			await faceapi.nets.faceExpressionNet.loadFromUri('/models');

			setRoom(room);
			room.on('participantConnected', playerJoined);
			room.on('participantDisconnected', playerLeft);
			room.participants.forEach(playerJoined);

			socket.on('game-started', () => {
				setStatus(statuses[1]) 
			});
			socket.on('your-turn', ({prompt_num}) => {
				 //prompt status
				//choose prompt
				setprompt(prompts[prompt_num]);
				socket.emit('prompt', {prompt: prompts[prompt_num]});
				socket.emit('update_num_turns',{num_turns: prompt_num});
				//setnumturns(prompt_num);
				setYourTurn(true);
				setStatus(statuses[2]);
				socket.emit('my-turn', { playerSid: room.localParticipant.sid });
			});
			socket.on('others-turn', ({ otherSid }) => {
				setStatus(statuses[2]);
				setYourTurn(false);
			});
			socket.on('update_prompt', ({prompt})=>{
				setprompt(prompt);
				//console.log(prompt);
			})
			socket.on('UPDATE_NUM_TURNS', ({num_turns})=>{
				setnumturns(num_turns);
			})
			socket.on('joke-revealed', ({joke}) => {
				setStatus(statuses[4]);
				console.log(joke);
				setjoke(joke)
				  //this is received
				//joke is undefined here
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
			<p>CURRENT JOKE? {`${joke}`}</p>
			{status === 'before-start' && <button onClick={handleStartGame}>Start Game</button>}
			{(status === 'prompt') && <h1>{`${prompt}`}</h1>/*display prompt for everyone*/ }
			{(status === 'prompt' && yourTurn) && ( <div id ="test">
			
			<form class="prompt" onSubmit={handleSubmitJoke}> {/*wtf form defaults to redirecting???*/} 
			<input
				type="text"
				id="joke"
				name="joke"
				// placeholder="Name"
				onChange={handleChange}
				value={joke}
			/>		
			</form>
			</div>
			)}
			{(status === 'turn-end') && <button onClick={handleNextTurn}>Next turn</button>}
			{(status === 'reveal') && <h1>{`${joke}`}</h1>}
      <button onClick={handleLogout}>Log out</button>
      <div className="this-player">
        {room ? (
					<Player
						isLocalParticipant={true}
            key={room.localParticipant.sid}
            player={room.localParticipant}
						socket={socket}
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
