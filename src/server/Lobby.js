define(function (require) {
	"use strict";

	const requirejs = require("requirejs");
	const serverConstants = requirejs("./src/server/serverConstants.js");

	const List = requirejs("./src/server/List.js");

	class Lobby {
		constructor (id) {
			this.id = id;

			this.users = {};
			this.numUsers = 0;
			this.maxUsers = 100;

			this.rooms = {};

			this.name = "lobby";

			List.Loc[this.name][this.id] = this;

			// update users with lobby info
			this.intervalID = setInterval(()=>this.sendLobbyInfoToUsers(this.users), serverConstants.LOBBY_REFRESH_DELAY * 1000);
		}

		canAddUser(user) {
			if (this.numUsers < this.maxUsers) {
				return {status: "Success"};
			} else {
				return {status: "ERROR: " + this.name + " " + this.id + " is full"};
			}
		}

		addUser(user) {
			if (this.numUsers < this.maxUsers) {
				this.users[user.id] = user;
				this.numUsers += 1;

				// send lobby info to newly joined user
				var obj = {};
				obj[user.id] = user;
				this.sendLobbyInfoToUsers(obj);

				return {status: "Success"};
			} else {
				return {status: "ERROR: " + this.name + " " + this.id + " is full"};
			}
		}

		removeUser(user) {
			if (user.id in this.users) {
				delete this.users[user.id];
				this.numUsers -= 1;
			} else {
				console.log("ERROR: Tried to remove user " + user + " from " + this.name + " " + this.id + ", but user was not present");
			}
		}

		addRoom(room) {
			this.rooms[room.id] = room;
		}

		removeRoom(room) {
			delete this.rooms[room.id];
		}

		sendLobbyInfoToUsers (users) {
			var pack = {
				numUsers: this.numUsers,
				rooms: {},
			};
			for (var roomID in this.rooms) {
				pack.rooms[roomID] = {
					id: roomID,
					numUsers: this.rooms[roomID].numUsers,
					maxUsers: this.rooms[roomID].maxUsers,
				}
			}
			for (var id in users) {
				var user = users[id];
				user.socket.emit("lobbyInfo", pack);
			}
		}

		destroy() {
			clearInterval(this.intervalID);
			delete List.Loc[this.name][this.id];
		}
	}

	return Lobby;
});
