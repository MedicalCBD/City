const WebSocket = require('ws');
const http = require('http');
const path = require('path');
const fs = require('fs');
const server = http.createServer();
const wss = new WebSocket.Server({ 
    server,
    path: '/ws' // optional: specify WebSocket path
});

// pengstrike game state
const pengstrikePlayers = new Map();
const pengstrikeBalls = [];
const BALL_LIFETIME = 10000; // 10 seconds

// climbandwin game state
const climbandwinPlayers = new Map();
const climbandwinColors = [
    '#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff',
    '#ff8800', '#8800ff', '#00ff88', '#ff0088', '#88ff00', '#0088ff'
];
let colorIndex = 0;

wss.on('connection', (ws) => {
    const playerId = generateId();
    let gameType = 'pengstrike'; // default game
    let playerColor = null;
    
    // determine game type from URL or other means
    // for now, we'll use a simple approach based on connection timing
    
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            
            // handle game type selection
            if (data.type === 'gameType') {
                gameType = data.gameType;
                
                if (gameType === 'climbandwin') {
                    // assign color for climbandwin
                    playerColor = climbandwinColors[colorIndex % climbandwinColors.length];
                    colorIndex++;
                    
                    const player = {
                        id: playerId,
                        position: { x: 0, y: 1, z: 0 },
                        rotation: { x: 0, y: 0, z: 0 },
                        velocity: { x: 0, y: 0, z: 0 },
                        onFloor: false,
                        color: playerColor
                    };
                    
                    climbandwinPlayers.set(playerId, player);
                    
                    // send current climbandwin players to new player
                    const currentPlayers = Array.from(climbandwinPlayers.values()).filter(p => p.id !== playerId);
                    ws.send(JSON.stringify({
                        type: 'init',
                        playerId: playerId,
                        playerColor: playerColor,
                        players: currentPlayers
                    }));
                    
                    // notify other climbandwin players about new player
                    broadcastToOthers(ws, {
                        type: 'playerJoined',
                        player: player
                    });
                    
                    console.log(`climbandwin player ${playerId} connected. total players: ${climbandwinPlayers.size}`);
                } else {
                    // pengstrike game
                    const player = {
                        id: playerId,
                        position: { x: 0, y: 1, z: 0 },
                        rotation: { x: 0, y: 0, z: 0 },
                        velocity: { x: 0, y: 0, z: 0 },
                        onFloor: false
                    };
                    
                    pengstrikePlayers.set(playerId, player);
                    
                    // send current pengstrike players to new player
                    const currentPlayers = Array.from(pengstrikePlayers.values()).filter(p => p.id !== playerId);
                    ws.send(JSON.stringify({
                        type: 'init',
                        playerId: playerId,
                        players: currentPlayers,
                        balls: pengstrikeBalls
                    }));
                    
                    // notify other pengstrike players about new player
                    broadcastToOthers(ws, {
                        type: 'playerJoined',
                        player: player
                    });
                    
                    console.log(`pengstrike player ${playerId} connected. total players: ${pengstrikePlayers.size}`);
                }
                return;
            }
            
            // handle game-specific messages
            if (gameType === 'climbandwin') {
                handleClimbandwinMessage(ws, playerId, data);
            } else {
                handlePengstrikeMessage(ws, playerId, data);
            }
        } catch (error) {
            console.error('error parsing message:', error);
        }
    });
    
    ws.on('close', () => {
        if (gameType === 'climbandwin') {
            climbandwinPlayers.delete(playerId);
            broadcastToAll({
                type: 'playerLeft',
                playerId: playerId
            });
            console.log(`climbandwin player ${playerId} disconnected. total players: ${climbandwinPlayers.size}`);
        } else {
            pengstrikePlayers.delete(playerId);
            broadcastToAll({
                type: 'playerLeft',
                playerId: playerId
            });
            console.log(`pengstrike player ${playerId} disconnected. total players: ${pengstrikePlayers.size}`);
        }
    });
});

function updatePlayerPosition(playerId, position, rotation, velocity, onFloor) {
    // this function is kept for backward compatibility but not used
    // the new functions are updatePengstrikePlayerPosition and updateClimbandwinPlayerPosition
}

function broadcastToAll(message) {
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(message));
        }
    });
}

function broadcastToOthers(excludeWs, message) {
    wss.clients.forEach(client => {
        if (client !== excludeWs && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(message));
        }
    });
}

function generateId() {
    return Math.random().toString(36).substr(2, 9);
}

function handlePengstrikeMessage(ws, playerId, data) {
    switch (data.type) {
        case 'updatePosition':
            updatePengstrikePlayerPosition(playerId, data.position, data.rotation, data.velocity, data.onFloor);
            broadcastToOthers(ws, {
                type: 'playerUpdate',
                playerId: playerId,
                position: data.position,
                rotation: data.rotation,
                velocity: data.velocity,
                onFloor: data.onFloor
            });
            break;
            
        case 'throwBall':
            const ball = {
                id: generateId(),
                position: data.position,
                velocity: data.velocity,
                timestamp: Date.now()
            };
            pengstrikeBalls.push(ball);
            
            // remove ball after lifetime
            setTimeout(() => {
                const index = pengstrikeBalls.findIndex(b => b.id === ball.id);
                if (index !== -1) {
                    pengstrikeBalls.splice(index, 1);
                }
            }, BALL_LIFETIME);
            
            broadcastToAll({
                type: 'ballThrown',
                ball: ball
            });
            break;
    }
}

function handleClimbandwinMessage(ws, playerId, data) {
    switch (data.type) {
        case 'updatePosition':
            updateClimbandwinPlayerPosition(playerId, data.position, data.rotation, data.velocity, data.onFloor);
            broadcastToOthers(ws, {
                type: 'playerUpdate',
                playerId: playerId,
                position: data.position,
                rotation: data.rotation,
                velocity: data.velocity,
                onFloor: data.onFloor
            });
            break;
    }
}

function updatePengstrikePlayerPosition(playerId, position, rotation, velocity, onFloor) {
    const player = pengstrikePlayers.get(playerId);
    if (player) {
        player.position = position;
        player.rotation = rotation;
        player.velocity = velocity;
        player.onFloor = onFloor;
    }
}

function updateClimbandwinPlayerPosition(playerId, position, rotation, velocity, onFloor) {
    const player = climbandwinPlayers.get(playerId);
    if (player) {
        player.position = position;
        player.rotation = rotation;
        player.velocity = velocity;
        player.onFloor = onFloor;
    }
}

// serve static files
server.on('request', (req, res) => {
    let filePath = req.url;
    
    // default to city.html
    if (filePath === '/') {
        filePath = '/three.js/examples/city.html';
    }
    
    // remove query parameters
    filePath = filePath.split('?')[0];
    
    // construct full path
    const fullPath = path.join(__dirname, filePath);
    
    // check if file exists
    fs.access(fullPath, fs.constants.F_OK, (err) => {
        if (err) {
            // file not found, serve 404
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('404 not found');
            return;
        }
        
        // get file extension for content type
        const ext = path.extname(fullPath);
        let contentType = 'text/plain';
        
        switch (ext) {
            case '.html':
                contentType = 'text/html';
                break;
            case '.js':
                contentType = 'application/javascript';
                break;
            case '.css':
                contentType = 'text/css';
                break;
            case '.json':
                contentType = 'application/json';
                break;
            case '.png':
                contentType = 'image/png';
                break;
            case '.jpg':
            case '.jpeg':
                contentType = 'image/jpeg';
                break;
            case '.gif':
                contentType = 'image/gif';
                break;
            case '.svg':
                contentType = 'image/svg+xml';
                break;
            case '.glb':
                contentType = 'model/gltf-binary';
                break;
            case '.gltf':
                contentType = 'model/gltf+json';
                break;
        }
        
        // read and serve file
        fs.readFile(fullPath, (err, data) => {
            if (err) {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('500 internal server error');
                return;
            }
            
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(data);
        });
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`pengstrike multiplayer server running on port ${PORT}`);
    console.log(`server available at: http://localhost:${PORT}`);
});
