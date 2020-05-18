#!/usr/bin/nodejs

const express = require('express')
const path = require('path');
const hbs = require('hbs');
const fs = require('fs');
const requirejs = require("requirejs");

var app = express();

app.set('port', process.env.PORT || 8080);

app.set('views', './client/views');
app.set('view engine', 'hbs');

// app.use('/client', express.static(path.join(__dirname, 'client')));
app.use('/css', express.static(path.join(__dirname, 'client/css')));
app.use('/js', express.static(path.join(__dirname, 'client/js')));
app.use('/sounds', express.static(path.join(__dirname, 'client/sounds')));
app.use('/images', express.static(path.join(__dirname, 'client/images')));
app.use('/favicon.ico', express.static(path.join(__dirname, 'client/images/favicon.ico')));
app.use('/src/game', express.static(path.join(__dirname, 'src/game')));

const serverConstants = requirejs("./src/server/serverConstants.js");

app.get('/', function(req, res){
    console.log("about anon()");
    res.render("home", {
        defaultLobbyID: defaultLobbyID,
    });
});

app.get('/lobby', function(req, res){
    console.log("lobby anon()");
    res.render("lobby", {
        id: req.query.id,
        locationID: req.query.locationID,
    });
});

app.get('/room', function(req, res){
    console.log("room anon()");
    res.render("room", {
        id: req.query.id,
        locationID: req.query.locationID,
    });
});

app.get('/game', function(req, res){
    console.log("game anon()");
    res.render("game", {
        id: req.query.id,
    });
});

app.get("/map", function (req, res) {
    console.log("map anon()");
    res.render("map", {
    });
});

app.get('/error', function(req, res){
    console.log("error anon()");
    res.render("error", {
        errorMessage: req.query.message,
    });
});

var listener = app.listen(app.get('port'), function() {
  console.log('Express server started on port: ' + listener.address().port);
});

const List = requirejs("./src/server/List.js");
const User = requirejs("./src/server/User.js");
const Lobby = requirejs("./src/server/Lobby.js");
const Room = requirejs("./src/server/Room.js");
const Game = requirejs("./src/server/Game.js");

// create initial lobby
var defaultLobbyID = 1337;
List.Loc["lobby"][defaultLobbyID] = new Lobby(defaultLobbyID);

const io = require("socket.io")(listener);

io.sockets.on("connection", function(socket) {
    socket.on("connectUserRequest", function (connectData) {
        // check if username is valid
        if (!isValidUsername(connectData.id)) {
            var status = "Invalid username '" + connectData.id + "' attempted to connect.";
            socket.emit("connectUserResponse", {status: status});
        }

        // create new user
        if (!(connectData.id in List.User)) {
            List.User[connectData.id] = new User(connectData.id, socket);
        }
        var user = List.User[connectData.id];

        // check for duplicate logins
        if (user.socket != "none") {
            console.log("Duplicate user " + user.id + " tried to connect to '" + connectData.location + " " + connectData.locationID + ", but already in " + user.location + " " + user.locationID);
            socket.emit("connectUserResponse", {status: "ERROR: Name \'" + connectData.id + "\' already in use in " + user.location + " " + user.locationID});
            return;
        }

        // special case for home page
        if (connectData.location == "home") {
            socket.emit("connectUserResponse", {status: "Success"});
            return;
        }

        // check if location exists
        if (!(connectData.location in List.Loc && connectData.locationID in List.Loc[connectData.location])) {
            socket.emit("connectUserResponse", {status: "ERROR: Location " + connectData.location + " " + connectData.locationID + " does not exist."});
            return;
        }

        console.log("Connected user: " + connectData.id + " to " + connectData.location + " " + connectData.locationID);


        // setup connection
        socket.id = connectData.id;
        List.Socket[socket.id] = socket;
        user.connect(socket);
        var result = user.joinLocation(connectData.location, connectData.locationID);
        socket.emit("connectUserResponse", {status: result.status});

        // terminate if error occurs in joining location
        if (result.status != "Success") {
            return;
        }

        // create room
        socket.on("createRoomRequest", function (data) {
            var newRoom = new Room(user.locationID);
            var result = newRoom.canAddUser(user.id);
            socket.emit("createRoomResponse", {status: result.status, locationID: newRoom.id});
        });

        // refresh room
        socket.on("refreshRoomRequest", function (data) {
            var lobby = List.Loc[user.location][user.locationID];
            lobby.sendLobbyInfoToUsers([user]);
        });

        // join room
        socket.on("joinRoomRequest", function (data) {
            if (!(data.locationID in List.Loc.room)) {
                socket.emit("joinRoomRequest", {status: "Room does not exist"});
            } else {
                var room = List.Loc.room[data.locationID];
                var result = room.canAddUser(user.locationID);
                socket.emit("joinRoomResponse", {status: result.status});
            }
        });

        // switch teams
        socket.on("switchTeamRequest", function (data) {
            if (user.location != "room") {
                console.log("ERROR: User " + user.id + " tried to switch teams when not in a room");
                socket.emit("switchTeamResponse", {status: "ERROR: User " + user.id + " trying to swtich teams when not in a room"});
            }
            var room = List.Loc.room[user.locationID];
            var result = room.switchTeam(user, data.teamID);
            socket.emit("switchTeamResponse", {status: result.status});
        });

        // start game
        socket.on("startGameRequest", function(data) {
            var room = List.Loc.room[data.locationID];
            var game = new Game(room);
            List.Loc.game[game.id] = game;
            room.startGameResponse();
        });


        // disconnect and clean up
        socket.on("disconnect", function() {
            console.log("Removed socket with id " + user.id + " from " + user.location + " " + user.locationID);
            List.User[user.id].disconnect();
            delete List.Socket[user.id];
        });
    });
});

// length must be between 1 and 20, inclusive
// allows letters, numbers, and space
function isValidUsername (id) {
	if (id.length < 1 || id.length > 20) {
		return false;
	}
	if (id.trim() != id) {
		return false;
	}
	for (var i = 0; i < id.length; i++) {
		var k = id.charCodeAt(i);
		if ((k >= 65 && k <= 90) || (k >= 95 && k <= 122) || (k >= 48 && k <= 57) || (k == 32)) {
		} else {
			return false;
		}
	}
	return true;
}
