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

const app = express();
const server = require("http").createServer(app);
const io = require("socket.io")(server);

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
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
	socket.on('start-game', async ({ playerSid, roomSid }) => {
		const scores = {};
		console.log(twilioClient.video.rooms(roomSid).participants);
		const room = await twilioClient.video.rooms(roomSid).fetch();
		const participants = await room.participants.fetch();
		console.log(room);
		// const startingPlayer = room.participants;
		// Send info back to all users
		//
	})
});

PORT = process.env.PORT || 3001
server.listen(PORT, () => console.log(`server running on port ${PORT}`))
