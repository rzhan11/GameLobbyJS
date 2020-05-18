define(function (require) {
	"use strict";

	const requirejs = require("requirejs");
	const List = requirejs("./src/server/List.js");

	class User {
		constructor (id) {
			this.id = id;
			this.socket = "none"; // otherwise it points to the socket
			this.location = "none"; // "lobby", "room", "game"
			this.locationID = -1;

			List.User[this.id] = this;
		}

		joinLocation(location, locationID) {
			var validLocations = {home: 1, lobby: 1, room: 1, game: 1};
			if (!(location in validLocations)) {
				var status ="ERROR: Tried to connect to unknown location " + location + " " + locationID
				console.log(status);
				return {status: status};
			}

			var result = List.Loc[location][locationID].addUser(this);
			if (result.status == "Success") {
				this.locationID = locationID;
				this.location = location;
			} else {
				console.log("ERROR: User tried to connect to " + location + " " + locationID);
				console.log("Reason: " + result.status);
			}
			return {status: result.status};
		}

		connect(socket) {
			this.socket = socket;
			socket.on("pingRequest", function (data) {
				socket.emit("pingResponse", data);
			});
		}

		disconnect () {
			List.Loc[this.location][this.locationID].removeUser(this);
			this.socket.removeAllListeners("pingRequest");
			this.socket = "none";
		}
	}

	return User;
});
