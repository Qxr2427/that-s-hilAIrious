# that's hilAIrious!
*Who's the funniest? We'll let AI be the judge.*
<br>
An online party game with video call where players tell jokes and get points based on how the others react.
<br><br>
Our submission for Hack the North 2021.

## Links
- [Try it out!](https://thats-hilairious.herokuapp.com/)
- [Devpost](https://devpost.com/software/that-s-hilairious)

## What it does
that's hilAIrious is an online party game where friends can tell jokes and win points for how much they make their friends laugh, based on our algorithm which uses Face API. Players can join individual rooms, where they'll be able to see and chat with other players. 
<br><br>
Once the game is started, each player will have a turn to respond to a prompt, after which their response is revealed to the room and our algorithm calculates the player's score based on how much the others were laughing. At the end of the game, players can compare scores and see who was the funniest in the group!

## Technologies
Our game uses a Express.js backend server and a React frontend. Twilio is used to stream video and audio between the players, while Socket.io allows the backend and clients to communicate in order for game mechanics to proceed in real time. We use Face API, a library built on top of TensorFlow.js, to analyze how much each player is laughing and generate a score from that.

## Local Development
### Run the Express server
```bash
npm install
npm start
```
### Run the React frontend
```bash
cd react-ui
npm install
npm start
```

## Developers
- [Alex Qiu](https://github.com/Qxr2427)
- [Rory Gao](https://github.com/biosharp18)
- [Alex Chan](https://github.com/alex4787)
