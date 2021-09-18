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

const videoTokenFor = (identity, room) => {
	let videoGrant;
  if (typeof room !== 'undefined') {
    videoGrant = new VideoGrant({ room });
  } else {
    videoGrant = new VideoGrant();
  }
	console.log(identity);
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
	console.log(token);
	res.send(JSON.stringify({ token: token.toJwt() }))
})

app.get('*', function(request, response) {
	response.sendFile(path.resolve(__dirname, '../react-ui/build', 'index.html'));
});

io.on("connection", socket => {
	socket.on('start-game', ({ playerSid, roomSid }) => {
		const order = [...io.sockets.sockets.keys()];
		console.log(order);
		order.splice(order.indexOf(socket.id), 1);
		order.unshift(socket.id);

		console.log(order);

		const roomInfo = {};

		roomInfo.order = order;
		roomInfo.curIndex = 0;
		roomInfo.scores = {};
		roomInfo.order.forEach(id => roomInfo.scores[id] = {
			max10Score: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
			totalScore: 0,
			totalCount: 0,
			finalScore: 0
		});

		games[roomSid] = roomInfo;
		io.emit('game-started');
		number_turns = order.length;
		console.log(number_turns)
		io.to(order[roomInfo.curIndex]).emit('your-turn', {prompt_num: number_turns});
	});

	socket.on('reveal-joke', (data) => {
		console.log("console joke",data.text);
		io.emit('joke-revealed', {joke: data.text});
		setTimeout(() => {
			io.emit('turn-finished');
		}, 10000);
	})
	socket.on('process_score', (data) => {
		let cur_score = data.cur_score;
		games[roomSid].scores.totalScore += cur_score;
		scores.totalCount += 1;
		scores.max10Score.push(cur_score);
		scores.max10Score.sort(function (a, b) {  return a - b;  });
		scores.max10Score = max10Score.slice(1);
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
		games[roomSid].curIndex++;
		if (games[roomSid].curIndex >= games[roomSid].order.length) {
			io.emit('game-ended')
			return;
		}

		io.to(games[roomSid].order[games[roomSid].curIndex]).emit('your-turn', {prompt_num: num_turns});
	})

	socket.on('my-turn', ({ playerSid }) => {
		socket.broadcast.emit('others-turn', { otherSid: playerSid });
	})
});

PORT = process.env.PORT || 5000
server.listen(PORT, () => console.log(`server running on port ${PORT}`))
