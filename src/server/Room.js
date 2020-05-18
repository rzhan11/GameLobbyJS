define(function (require) {
	"use strict";

	const requirejs = require("requirejs");
	const serverConstants = requirejs("./src/server/serverConstants.js");

	const List = requirejs("./src/server/List.js");

	class Room {
		constructor (lobbyID, id) {
			if (id == undefined) {
				id = this.generateRandomRoomID(serverConstants.ROOM_ID_LENGTH);
			}
			this.id = id;
			this.lobbyID = lobbyID;
			this.users = {};
			this.numUsers = 0;

			this.numTeams = 2;
			this.maxUsersPerTeam = [5, 5];

			this.maxUsers = 0;
			this.teams = [];
			for (var i = 0; i < this.numTeams; i++) {
				this.maxUsers += this.maxUsersPerTeam[i];
				this.teams.push({});
			}

			// default game settings
			this.gameSettings = {
				numRoundsToWin: 5,
				totalRoundTime: 100,
			}


			this.name = "room";
			List.Loc[this.name][this.id] = this;
			// add room to lobby
			List.Loc.lobby[lobbyID].addRoom(this);

			this.intervalID = setInterval(()=>this.sendRoomInfoToUsers(this.users), serverConstants.LOBBY_REFRESH_DELAY * 1000);
		}

		generateRandomRoomID (length) {
			var code = "";
			var start = "A".charCodeAt(0);
			var end = "Z".charCodeAt(0);
			for (var i = 0; i < length; i++) {
				code += String.fromCharCode(Math.floor(Math.random() * (end - start)) + start);
			}
			return code;
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

				// add user to team
				for (var i = 0; i < this.numTeams; i++) {
					var curTeamSize = Object.keys(this.teams[i]).length;
					if (curTeamSize < this.maxUsersPerTeam[i]) {
						this.teams[i][user.id] = user;
						break;
					}
				}
				this.numUsers += 1;

				this.setupChangeOption(user);
				// send room info to newly joined user
				this.sendRoomInfoToUsers(this.users);

				return {status: "Success"};
			} else {
				return {status: "ERROR: " + this.name + " " + this.id + " is full"};
			}
		}

		removeUser(user) {
			if (user.id in this.users) {
				// remove user from team
				var team = this.getUserTeam(user);
				delete this.teams[team][user.id];

				delete this.users[user.id];
				this.numUsers -= 1;

				// if room is empty, destroy it
				if (this.numUsers == 0) {
					this.destroy();
				} else {
					// send updated room info to all players
					this.sendRoomInfoToUsers(this.users);
				}
			} else {
				console.log("ERROR: Tried to remove user " + user + " from " + this.name + " " + this.id + ", but user was not present");
			}
		}

		// if not found, returns -1 and logs an error
		getUserTeam(user) {
			for (var i = 0; i < this.teams.length; i++) {
				if (user.id in this.teams[i]) {
					return i;
				}
			}
			console.log("ERROR: Tried to find team of user " + user + ", but they are not in this room " + this.id)
			return -1;
		}

		switchTeam (user, teamID) {
			if (teamID >= this.teams.length) {
				return {status: "ERROR: Cannot switch. Team " + teamID + " does not exist."}
			} else {
				var targetTeamSize = Object.keys(this.teams[teamID]).length;
				if (targetTeamSize >= this.maxUsersPerTeam[teamID]) {
					return {status: "ERROR: Cannot switch. Team " + teamID + " is full."}
				}
			}

			var curTeam = this.getUserTeam(user);
			// team switch is legal, perform switch
			delete this.teams[curTeam][user.id];
			this.teams[teamID][user.id] = user;

			// send updated teams to all users
			this.sendRoomInfoToUsers(this.users);
			return {status: "Success"};
		}

		setupChangeOption (user) {
			var socket = user.socket;
			if (socket != "none") {
				socket.on("changeOption", (data)=>this.tryChangeOption (data));
			}
		}

		tryChangeOption (data) {
			if (!(data.name in Room.ALL_GAME_SETTINGS)) {
				console.log("ERROR: Tried to change option '" + data.name + "', but option does not exist");
				return;
			}
			// check if string representation of value is a valid setting
			for (var i = 0; i < Room.ALL_GAME_SETTINGS[data.name].length; i++) {
				var option = Room.ALL_GAME_SETTINGS[data.name][i];
				if (option.toString() == data.value.toString()) {
					this.gameSettings[data.name] = data.value;
					this.sendRoomInfoToUsers(this.users);
					break;
				}
			}
		}

		sendRoomInfoToUsers (users) {
			var pack = {
				lobbyID: this.lobbyID,
				maxUsersPerTeam: this.maxUsersPerTeam,
				gameSettings: this.gameSettings,
				ALL_GAME_SETTINGS: Room.ALL_GAME_SETTINGS,
			};

			pack.teams = [];
			for (var i = 0; i < this.teams.length; i++) {
				pack.teams.push([]);
				for (var id in this.teams[i]) {
					pack.teams[i].push(id);
				}
			}

			for (var id in users) {
				var user = users[id];
				user.socket.emit("roomInfo", pack);
			}
		}

		startGameResponse() {
			for (var id in this.users) {
				this.users[id].socket.emit("startGameResponse", {status: "Success"});
			}
		}

		destroy() {
			// remove this room from the lobby
			List.Loc.lobby[this.lobbyID].removeRoom(this);
			// stops the interval command
			clearInterval(this.intervalID);
			delete List.Loc[this.name][this.id];
			// possible feature: allow room to be destroyed, even when there are still maxUsers
			// kick any of the users from the destroyed room back to the lobby
		}
	}
	Room.ALL_GAME_SETTINGS = {
		numRoundsToWin: [3, 5, 10, 13],
		totalRoundTime: [10, 60, 100, 180],
	}

	return Room;
});
