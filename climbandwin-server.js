const WebSocket = require('ws');
const path = require('path');
const fs = require('fs');

const wss = new WebSocket.Server({ port: 8081 });

// store connected players
const players = new Map();

// generate unique player id
function generateId() {
    return Math.random().toString(36).substr(2, 9);
}

// broadcast message to all connected clients
function broadcastToAll(message) {
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(message));
        }
    });
}

// broadcast message to all clients except sender
function broadcastToOthers(message, sender) {
    wss.clients.forEach(client => {
        if (client !== sender && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(message));
        }
    });
}

// predefined penguin colors
const penguinColors = [
    0xff0000, // red
    0x00ff00, // green
    0x0000ff, // blue
    0xffff00, // yellow
    0xff00ff, // magenta
    0x00ffff, // cyan
    0xff8800, // orange
    0x8800ff, // purple
    0x008800, // dark green
    0x880000, // dark red
    0x000088, // dark blue
    0x888800, // dark yellow
];

let colorIndex = 0;

wss.on('connection', (ws) => {
    const playerId = generateId();
    const playerColor = penguinColors[colorIndex % penguinColors.length];
    colorIndex++;
    
    // initialize player
    players.set(playerId, {
        id: playerId,
        position: { x: 0, y: 10, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        velocity: { x: 0, y: 0, z: 0 },
        onFloor: false,
        color: playerColor
    });
    
    console.log(`player ${playerId} connected with color ${playerColor.toString(16)}`);
    
    // send initialization data to new player
    ws.send(JSON.stringify({
        type: 'init',
        playerId: playerId,
        playerColor: playerColor,
        players: Array.from(players.values()).filter(p => p.id !== playerId),
        objects: [] // climbandwin doesn't have moving objects like balls
    }));
    
    // notify other players about new player
    broadcastToOthers({
        type: 'playerJoined',
        player: players.get(playerId)
    }, ws);
    
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            
            switch (data.type) {
                case 'updatePosition':
                    const player = players.get(playerId);
                    if (player) {
                        player.position = data.position;
                        player.rotation = data.rotation;
                        player.velocity = data.velocity;
                        player.onFloor = data.onFloor;
                        
                        // broadcast position update to other players
                        broadcastToOthers({
                            type: 'playerUpdate',
                            playerId: playerId,
                            position: data.position,
                            rotation: data.rotation,
                            velocity: data.velocity,
                            onFloor: data.onFloor
                        }, ws);
                    }
                    break;
                    
                default:
                    console.log('unknown message type:', data.type);
            }
        } catch (error) {
            console.error('error parsing message:', error);
        }
    });
    
    ws.on('close', () => {
        console.log(`player ${playerId} disconnected`);
        players.delete(playerId);
        
        // notify other players about disconnection
        broadcastToAll({
            type: 'playerLeft',
            playerId: playerId
        });
    });
});

console.log('climbandwin WebSocket server running on port 8081');
