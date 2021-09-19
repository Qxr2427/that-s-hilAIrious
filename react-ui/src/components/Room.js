import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import Video from 'twilio-video';
import Player from './Player';
import Anime, { anime } from 'react-anime';
import "../App.css"

let colors = [ 'blue', 'green', 'red' ];

const statuses = [
	'before-start',
	'intro',
	'prompt',
	'waiting',
	'reveal',
	'turn-end',
	'game-end',
	'standings',
]

var curID;

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
	const [curID, setCurID] = useState('');
	const [Name, setName] = useState('');
	const [Socketid, setSocketid] = useState('');
	const otherPlayers = players.map(p => <Player isLocalParticipant={false}
		key={p.sid} player={p} socket={socket} roomSid={room.sid} inGame={status === 'reveal'} status={status} curID={curID} />);


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


			//console.log(Name);
			socket.on('game-started', () => {
				socket.emit('exchange_names');
				//console.log('exchange names')
				setStatus(statuses[1]) 
			});
			socket.on('here_is_my_name', ({name, socketid})=>{
				socket.emit('back_to_you', ({name: name, socketid: socketid}))
			})
			socket.on('your-turn', ({prompt_num, id}) => {
				 //prompt status
				//choose prompt
				setprompt(prompts[prompt_num]);
				setCurID(id);
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
				socket.emit("leaderboard")
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
							curID={curID}
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
						<>
						{yourTurn &&
						<div className='infoWindowBoundingBox' style={{ position: 'absolute', left: '-250px' }}>
						<Anime translateX={250}>
						<Anime delay={3000} translateX={250} opacity={0}>
						<div className='infoWindow'>Your turn!</div>
						</Anime>
						</Anime>
						</div>
						}
						<div className='infoWindowBoundingBox'>
						<Anime delay={yourTurn ? 3500 : 0} opacity={[0, 100]} duration={300}>
								<div className='prompt-box'><h4>PROMPT:</h4>{`${prompt}`}</div>
						</Anime>
						</div>
						</>
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
									autoComplete="off"
								/>		
								<button type="submit">Done!</button>
							</form>
						</div>
					)}
					{(status === 'turn-end') && <button onClick={handleNextTurn}>Next turn</button>}
					{(status === 'reveal') && <div id="prompt-box"><h1>{`${prompt}`}</h1><h1>{`${joke}`}</h1></div>}
					{(status === 'game-end') && (
						<div>
							<Anime translateY={150}>
								<h1>GAME OVER!</h1>
							</Anime>
							<button onClick={() => {
								setStatus(statuses[7])
							}}>
								Standings
							</button>
						</div>
					)}
					{(status === 'standings') && <Standings roomCode={room.sid} socket={socket} />}
				</div>
			</div>
		</div>
	)
};

const BeforeStart = ({ roomCode, handleStartGame }) => {
	return (
		<div id="before-start">
			<p style={{ fontSize: "30px", color: "white" }}>To join, go to thats-hilairious.herokuapp.com and enter the code:</p>
			<h1>{roomCode}</h1>
			<button onClick={handleStartGame}>Start Game</button>
			<div id="instructions">
				<p style={{ fontSize: "30px", color: "white" }}>Rules: 
					Answer the prompt, make your friends laugh!
					Look at your funny score to see how funny you are :)
				</p>
				<p style={{ fontSize: "30px", color: "white" }}>Round length: 10 seconds</p>
			</div>
		</div>
	);
}

const Standings = ({ roomCode, socket }) => {
	const [scores, setScores] = useState([]);
	const [players, setPlayers] = useState([]);
	var scoreMap = [];
	var col1 = [<h2 id ="standings1">Standings</h2>];
	var col2 = [<h2 id = "standings2">Name</h2>];
	var col3 = [<h2 id = "standings3">Score</h2>]
	const suffix = (n) => {
		let a = n % 10;
		let b = n % 100;
		if (a == 1 && b != 11) return n + "st";
		if (a == 2 && b != 12) return n + "nd";
		if (a == 3 && b != 13) return n + "rd";
		else return n + "th"
	}

	useEffect(() => {
		socket.emit('show-standings', {roomSid: roomCode})
		socket.on('standings', ({scores, players}) => {
			console.log("Scores",scores);
			console.log("Players",players);
			setScores(scores);
			setPlayers(players);
		})
	}, [])

	const generateBoard = () => {
		for (var id in scores) {
			scoreMap[players[id]] = scores[id].finalScore ? scores[id].finalScore : 0
		}
		let l = Object.keys(scoreMap).length;
		const sortedMap = Object.entries(scoreMap).sort((a, b)=> b[1] - a[1])
		for (var i = 1; i <= l; ++i) {
			col1.push(<h2>{suffix(i)}</h2>); 
			col2.push(<h2>{sortedMap[i-1][0]}</h2>);
			col3.push(<h2>{Math.floor(sortedMap[i-1][1])}</h2>);
		}
		console.log(sortedMap)
		return;
	}
	generateBoard();

	return ( 
		<div id="game-end" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gridGap: 20 }}>
			<div>{col1}</div>
			<div>{col2}</div>
			<div>{col3}</div>
		</div>
	)
}

export default Room;
