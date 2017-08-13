var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var port = 4000;
var socketioJwt = require('socketio-jwt');
console.log("jwt: ", socketioJwt);
// return any file in the build dir except server.js
app.use('/', function (req, res, next) {
    if (req.originalUrl === '/server.js') {
        return res.status(403).end('403 Forbidden');
    }
    return res.sendFile(__dirname + req.originalUrl);
});

io.on('connection', (socket) => {    
    socket.broadcast.emit('message', "Hey you're now connected to me - says server");
    setTimeout(() => {
        console.log('mock authed')
        socket.broadcast.emit('authed', {'room': 'abci23', 'phone': '213445'});
    },20000);
    socket.on('tokenRequest', (clientId) => { // clientId is different from socketId        
        console.log('recieved token request from: ', clientId, ' on socket: ', socket.id);
        let client = addOrUpdateClient(clientId, socket, makeToken());
        io.to(socket.id).emit('token', client.authToken); // send the token to the one who asked for it (not everyone on the internet lol)
    });

    socket.on('testAuth', (data) => {
        if(!isAuthorized(socket, data)) {
            io.to(socket.id).emit('testAuthFail', 'authToken necessary to make requests: ' + data.toString());
            return;
        }
        io.to(socket.id).emit('testAuthSuccess', 'Your token is valid');
    })
    socket.on('tokenValidate', (data) => {
        if(!isAuthorized(socket, data)) {
            io.to(socket.id).emit('authError', 'authToken necessary to make requests');
            return;
        }

        let qrcode = data.qrcode; // the qrcode is a browser's current authToken
        // find the browser associated with this code
        let browser = 
        console.log("received validation request")
        let token = data.token;
        let validatingDevice = data.deviceId;
        // check if token is valid
        // emit authedToken (which both can use to communicate)
        if(Object.values(authorized).some(x => x === token)) {
            let authToken = makeToken();
            authorized[authToken] = {
                mobile: validatingDevice,
                web: Object.keys(authorized).find(x => authorized[x] == token)
            };
            socket.broadcast.emit('authToken', authToken);
        }
    })
});


server.listen(port, () => {
    console.log('server listening on port: ' + port);
});


var clients = [
    {
        clientId: "",   // the clients id
        sockets: [],    // yes one client can open multiple sockets
        roomId: "",     // a client can only be in one room (with the phone)
        authToken: "",  // validates authenticity of client
        roomToken: "",  // validates right to join room 
    }
];

var rooms = [
    {
        id: "",
        roomToken: "",
        socketIds: []
    }
];

var authorized = {};
function makeToken() {
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+<>?,./;'[]:{}|~`";

    for (var i = 0; i < 100; i++)
        text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
}
function isAuthorized(socket, data) {
    let token = data ? data.auth ? data.auth.authToken : false : false;
    let client = clients.find(c => c.sockets.indexOf(socket) != -1);
    if(!token || !client) return false;
    return client.authToken === token;
}

function addOrUpdateClient(clientId, socket, authToken) {
    let c = clients.find(c => c.clientId === clientId);
    if(c) {
        if(c.sockets.indexOf(socket) === -1)
            c.sockets.push(socket);
        c.authToken = authToken;
    }
    else {
        console.log("creating new client with id " + clientId + " on socket " + socket.id);
        c = { clientId: clientId, sockets: [socket], authToken: authToken }  
        clients.push(c);
    }
    return c;
}