const express = require('express');
const bodyParser = require('body-parser');
const pino = require('express-pino-logger')();

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
		roomInfo.order.forEach(id => roomInfo.scores[id] = 0);

		games[roomSid] = roomInfo;
		io.emit('game-started');
		io.to(order[roomInfo.curIndex]).emit('your-turn');
	});

	socket.on('reveal-joke', () => {
		io.emit('joke-revealed');

		setTimeout(() => {
			io.emit('turn-finished');
		}, 10000);
	})

	socket.on('next-turn', ({ playerSid, roomSid }) => {
		games[roomSid].curIndex++;
		if (games[roomSid].curIndex >= games[roomSid].order.length) {
			io.emit('game-ended')
			return;
		}

		io.to(games[roomSid].order[games[roomSid].curIndex]).emit('your-turn');
	})

	socket.on('my-turn', ({ playerSid }) => {
		socket.broadcast.emit('others-turn', { otherSid: playerSid });
	})
});

PORT = process.env.PORT || 5000
server.listen(PORT, () => console.log(`server running on port ${PORT}`))
