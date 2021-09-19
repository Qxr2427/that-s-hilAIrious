import React, { useState, useEffect, useCallback } from 'react';
import Video from 'twilio-video';
import Player from './Player';
import Anime, { anime } from 'react-anime';

let colors = [ 'blue', 'green', 'red' ];

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
	'The reason flamingos stand on one leg.',
	'The worst thing to say or do after someone farts.',
	'People who like this thing are the scum of the Earth.',
	'The name of the man who invented urinals.'
]


const Room = ({ socket, roomCode, token, handleLogout }) => {
	const [room, setRoom] = useState(null);
	const [players, setPlayers] = useState([]);
	const [status, setStatus] = useState(statuses[0]);
	const [yourTurn, setYourTurn] = useState(false);
	const [joke, setjoke] = useState('');
	const [prompt, setprompt] = useState('');
	const [numturns, setnumturns] = useState(0);
	const otherPlayers = players.map(p => <Player key={p.sid} player={p} socket={socket} roomSid={room.sid} inGame={status === 'reveal'} status={status}/>);


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
			await window.faceapi.nets.tinyFaceDetector.loadFromUri('/models');
			await window.faceapi.nets.faceLandmark68Net.loadFromUri('/models');
			await window.faceapi.nets.faceRecognitionNet.loadFromUri('/models');
			await window.faceapi.nets.faceExpressionNet.loadFromUri('/models');

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
				setStatus(statuses[2]); // this should be prompt
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
				setjoke('');
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
			<div id="sidebar">
				<div className="videos">
					{room ? (
						<Player
							isLocalParticipant={true}
							key={room.localParticipant.sid}
							player={room.localParticipant}
							socket={socket}
							roomSid={room.sid}
							inGame={status === 'reveal'}
						/>
					) : (
						''
					)}
					{otherPlayers}
				</div>
				<button onClick={handleLogout} style={{position: "absolute", bottom: '15px', justifyContent: 'center'}}>Exit game</button>
			</div>
			<div id="main">
				<div className="vertical-center">
					{status === 'before-start' && <BeforeStart roomCode={roomCode} handleStartGame={handleStartGame} />}
					{(status === 'prompt') && (
						<div className='infoWindowBoundingBox'>
						<Anime translateX={250}>
							<Anime delay={3000} translateX={250} opacity={0}>
						<div className='infoWindow'>{`PROMPT!: ${prompt}`}</div>
						</Anime>
						</Anime>
						</div>
					)}
					
					{(status === 'prompt' && yourTurn) && ( 
						<div className="Joke bar">
							<form className="Joke" onSubmit={handleSubmitJoke}> {/*wtf form defaults to redirecting???*/} 
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
					{(status === 'game-end') && (
						<Anime translateY={150}>
							<h1>GAME OVER!</h1>
						</Anime>
					)}
				</div>
			</div>
			<div id="dev-stats">
				<p>{status}</p>
				<p>Your turn? {`${yourTurn}`}</p>
				<p>CURRENT JOKE? {`${joke}`}</p>
			</div>
		</div>
	)
};

const BeforeStart = ({ roomCode, handleStartGame }) => {
	return (
		<div id="before-start">
			<p style={{ fontSize: "30px", color: "white" }}>To join, go to htn2021.game.com and enter the code:</p>
			<h1>{roomCode}</h1>
			<button onClick={handleStartGame}>Start Game</button>
		</div>
	);
}

export default Room;
