const WebSocket = require('ws');
const http = require('http');
const path = require('path');
const fs = require('fs');
const server = http.createServer();
const wss = new WebSocket.Server({ server });

const players = new Map();
const balls = [];
const BALL_LIFETIME = 10000; // 10 seconds

wss.on('connection', (ws) => {
    const playerId = generateId();
    const player = {
        id: playerId,
        position: { x: 0, y: 1, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        velocity: { x: 0, y: 0, z: 0 },
        onFloor: false
    };
    
    players.set(playerId, player);
    
    // send current players to new player
    const currentPlayers = Array.from(players.values()).filter(p => p.id !== playerId);
    ws.send(JSON.stringify({
        type: 'init',
        playerId: playerId,
        players: currentPlayers,
        balls: balls
    }));
    
    // notify other players about new player
    broadcastToOthers(ws, {
        type: 'playerJoined',
        player: player
    });
    
    console.log(`player ${playerId} connected. total players: ${players.size}`);
    
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            
            switch (data.type) {
                case 'updatePosition':
                    updatePlayerPosition(playerId, data.position, data.rotation, data.velocity, data.onFloor);
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
                    balls.push(ball);
                    
                    // remove ball after lifetime
                    setTimeout(() => {
                        const index = balls.findIndex(b => b.id === ball.id);
                        if (index !== -1) {
                            balls.splice(index, 1);
                        }
                    }, BALL_LIFETIME);
                    
                    broadcastToAll({
                        type: 'ballThrown',
                        ball: ball
                    });
                    break;
            }
        } catch (error) {
            console.error('error parsing message:', error);
        }
    });
    
    ws.on('close', () => {
        players.delete(playerId);
        broadcastToAll({
            type: 'playerLeft',
            playerId: playerId
        });
        console.log(`player ${playerId} disconnected. total players: ${players.size}`);
    });
});

function updatePlayerPosition(playerId, position, rotation, velocity, onFloor) {
    const player = players.get(playerId);
    if (player) {
        player.position = position;
        player.rotation = rotation;
        player.velocity = velocity;
        player.onFloor = onFloor;
    }
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

// serve static files
server.on('request', (req, res) => {
    let filePath = req.url;
    
    // default to index.html
    if (filePath === '/') {
        filePath = '/index.html';
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
