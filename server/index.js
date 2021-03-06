const express = require('express');
const bodyParser = require('body-parser');
const pino = require('express-pino-logger')();
const path = require('path');

const twilio = require('twilio');
const AccessToken = twilio.jwt.AccessToken;
const { VideoGrant } = AccessToken;
const config = require('./config');
const twilioClient = new twilio(
	config.twilio.apiKey,
	config.twilio.apiSecret,
	{ accountSid: config.twilio.accountSid },
);

const games = {};



const app = express();
const server = require("http").createServer(app);
const io = require("socket.io")(server);

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static('public'));
app.use(express.static(path.resolve(__dirname, '../react-ui/build')));
app.use(pino);

var id;

const videoTokenFor = (identity, room) => {
	let videoGrant;
  if (typeof room !== 'undefined') {
    videoGrant = new VideoGrant({ room });
  } else {
    videoGrant = new VideoGrant();
  }
	console.log("IDENTITY:", identity);
	id = identity;
	const token = new AccessToken(
		config.twilio.accountSid,
		config.twilio.apiKey,
		config.twilio.apiSecret,
		{ identity: identity },
	);
  token.addGrant(videoGrant);
  return token;
}

app.post('/token', (req, res) => {
	const token = videoTokenFor(req.body.name, req.body.roomCode);
	res.set('Content-Type', 'application/json');
	res.send(JSON.stringify({ token: token.toJwt() }))
})

app.get('*', function(request, response) {
	response.sendFile(path.resolve(__dirname, '../react-ui/build', 'index.html'));
});

const players = {};
io.on("connection", socket => {
	socket.on('my_name', ({name, socketid})=>{
		//io.to(socket.id).emit('save_name', {name:name, socketid: socket.id})
		//console.log('sent name')
		players[socket.id] = name;
		//console.log(players)
	});
	socket.on('exchange_names', ()=>{
		io.emit('here_is_my_name', {name: players[socket.id], socketid: socket.id});
	})
	socket.on('back_to_you', ({name, socketid})=>{
		players[socketid] = name;
	})

	socket.on('start-game', ({ playerSid, roomSid }) => {
		console.log(id, socket.id);
		const order = [...io.sockets.sockets.keys()];
		order.splice(order.indexOf(socket.id), 1);
		order.unshift(socket.id);

		console.log(order)
		const roomInfo = {};

		roomInfo.order = order;
		roomInfo.curIndex = 0;
		roomInfo.scores = {};
		roomInfo.order.forEach(id => roomInfo.scores[id] = {
			maxScores: [],
			totalScore: 0,
			totalCount: 0,
			finalScore: 0
		});

		games[roomSid] = roomInfo;
		io.emit('game-started');
		var number_turns = 0
		console.log(number_turns)
		io.to(order[roomInfo.curIndex]).emit('your-turn', {prompt_num: number_turns, id: order[roomInfo.curIndex]});
	});
	
	//id is undefined here
	
	socket.on('reveal-joke', (data) => {
		console.log("console joke",data.text);
		io.emit('joke-revealed', {joke: data.text});
		setTimeout(()=>{
			let prev_speaker = games[data.roomSid].order[games[data.roomSid].curIndex]
			let scores = games[data.roomSid].scores[prev_speaker]
			let max_scores_avg = scores.maxScores.reduce((pv, cv) => pv + cv, 0) / scores.maxScores.length
			io.emit('progress_check', {players: players, prev: prev_speaker, max_scores: max_scores_avg});
		},3000) //
		setTimeout(() => {
			if (games[data.roomSid].curIndex >= games[data.roomSid].order.length - 1) {
				let prev_speaker = games[data.roomSid].order[games[data.roomSid].curIndex]
				let scores = games[data.roomSid].scores[prev_speaker]
				let max_scores_avg = scores.maxScores.reduce((pv, cv) => pv + cv, 0) / scores.maxScores.length
				scores.finalScore = scores.totalScore / scores.totalCount * 0.25 + max_scores_avg * 0.75
				//game over condition
				io.emit('score_update', {scores: games[data.roomSid].scores, players: players, prev: prev_speaker});
				console.log(scores)
				io.emit('game-ended', {scores: games[data.roomSid].scores, players: players})
			} else {
				io.emit('turn-finished');
			}
		}, 10000);
	})
	socket.on('show-standings',(data) => {
		socket.emit('standings', {scores: games[data.roomSid].scores, players: players})
	})
	socket.on('process_score', (data) => {
		console.log("received score: ")
		console.log(data);
		let cur_score = data.cur_score;
		let speaker_id = games[data.roomSid].order[games[data.roomSid].curIndex]
		if (socket.id != speaker_id) {
			games[data.roomSid].scores[speaker_id].totalScore += cur_score;
			games[data.roomSid].scores[speaker_id].totalCount += 1;
			games[data.roomSid].scores[speaker_id].maxScores.push(cur_score);
			if (games[data.roomSid].scores[speaker_id].maxScores.length > 10 * (games[data.roomSid].order.length - 1)) {
				games[data.roomSid].scores[speaker_id].maxScores.sort(function (a, b) {  return a - b;  });
				games[data.roomSid].scores[speaker_id].maxScores.shift();
			}	
		}
	})
	socket.on('prompt', ({prompt})=>{
		io.emit('update_prompt', {prompt: prompt})
		console.log(prompt)
	})
	socket.on('update_num_turns', ({num_turns})=>{
		io.emit('UPDATE_NUM_TURNS', {num_turns: num_turns})
		//console.log(num_turns);
	})
	socket.on('next-turn', ({ playerSid, roomSid, num_turns }) => {
		
		console.log("next turn");
		//send score to visual
		let prev_speaker = games[roomSid].order[games[roomSid].curIndex]
		let scores = games[roomSid].scores[prev_speaker]
		let max_scores_avg = scores.maxScores.reduce((pv, cv) => pv + cv, 0) / scores.maxScores.length
		scores.finalScore = scores.totalScore / scores.totalCount * 0.25 + max_scores_avg * 0.75
		io.emit('score_update', {scores: games[roomSid].scores, players: players, prev: prev_speaker});
		//console.log(scores)
		games[roomSid].curIndex++;
		io.to(games[roomSid].order[games[roomSid].curIndex]).emit('your-turn', {prompt_num: num_turns, id: games[roomSid].order[games[roomSid].curIndex]});
		
	})

	socket.on('my-turn', ({ playerSid }) => {
		socket.broadcast.emit('others-turn', { otherSid: playerSid });
	})
});

PORT = process.env.PORT || 5000
server.listen(PORT, () => console.log(`server running on port ${PORT}`))
