# pengstrike multiplayer

a multiplayer version of the pengstrike game where you and your friends can play together in real-time using websockets.

## setup

1. install node.js dependencies:
```bash
npm install
```

2. start the websocket server:
```bash
npm start
```

3. open the multiplayer game in your browser:
```
http://localhost:3000/three.js/examples/pengstrike-multiplayer.html
```

## how to play

- **wasd**: move around
- **space**: jump
- **mouse**: look around
- **click and hold**: charge ball throw
- **release**: throw ball

## multiplayer features

- real-time player positions and movements
- synchronized ball throwing
- player count display
- connection status indicator
- automatic reconnection if connection is lost

## for your friends to join

1. make sure the server is running on your computer
2. share your computer's ip address with your friends
3. they should open: `http://YOUR_IP_ADDRESS:3000/three.js/examples/pengstrike-multiplayer.html`

## notes

- the server runs on port 3000 by default
- you can change the port by setting the `PORT` environment variable
- players are represented as green capsules
- multiplayer balls are red spheres
- your own balls remain yellow
- balls automatically disappear after 10 seconds or when they fall off the map
