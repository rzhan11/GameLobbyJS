define(function (require) {
	"use strict";

	const requirejs = require("requirejs");

	// clientConstants
	const serverConstants = requirejs("./src/server/serverConstants.js");

	// static variables
	const List = requirejs("./src/server/List.js");


	class Game {
		constructor (room) {
			this.id = room.id;
			this.lobbyID = room.lobbyID;

			// sets up users
			this.users = {};
			this.numUsers = 0;
			this.maxUsers = room.maxUsers;

			// sets up teams
			this.numTeams = room.numTeams;
			this.maxUsersPerTeam = room.maxUsersPerTeam;
			this.teams = [];
			for (var t = 0; t < room.teams.length; t++) {
				this.teams.push({});
				for (var id in room.teams[t]) {
					this.teams[t][id] = room.teams[t][id];
				}
			}

			this.allowedUsers = {}; // makes a copy of the original users, used for reconnecting validation
			this.userToTeam = {};
			for (var t = 0; t < this.teams.length; t++) {
				for (var id in this.teams[t]) {
					this.allowedUsers[id] = this.teams[t][id];
					this.userToTeam[id] = t;
				}
			}

			// sets up game state variables
			this.isPlayingGame = false;

			// sets up round info
			this.numRoundsToWin = room.gameSettings.numRoundsToWin;
			this.totalRoundTime = room.gameSettings.totalRoundTime;

			this.curRound = -1;
			this.round = {};
			this.roundWinHistory = [];
			this.numRoundsWon = [];
			for (var t = 0; t < this.teams.length; t++) {
				this.numRoundsWon.push(0);
			}

			this.name = "game";
			List.Loc[this.name][this.id] = this;
		}

		startGame () {
			console.log("Starting game " + this.id);
			this.isPlayingGame = true;


		}

		addUser(user) {
			if (user.id in this.userToTeam) {
				var teamID = this.userToTeam[user.id];
				// update user's variables
				user.location = this.name;
				user.locationID = this.id;

				this.users[user.id] = user;
				this.numUsers += 1;

				// check if game can be started when everyone has connected
				if (!this.isPlayingGame) { // if game has not started yet
					if (this.allUsersConnected()) {
						this.startGame();
					}
				} else {
					// checks for reconnection and updates socket
					this.sendReconnnectData(user);
				}
				return {status: "Success"};
			} else {
				return {status: "ERROR: User " + user.id + " is not allowed to join " + this.name + " " + this.id};
			}
		}

		allUsersConnected () {
			for (var id in this.allowedUsers) {
				var user = this.allowedUsers[id];
				if (user.location == "game" && user.locationID == this.id && user.socket != "none") {
					// do nothing
				} else {
					return false;
				}
			}
			return true;
		}

		sendReconnnectData (user) {
			this.players[user.id].updateSocket(user.socket);
			// send data through socket
		}

		removeUser(user) {
			if (user.id in this.users) {
				delete this.users[user.id];
				this.numUsers -= 1;
				if (!this.isPlayingGame && this.numUsers == 0) {
					this.destroy();
				}
			} else {
				console.log("ERROR: Tried to remove user " + user + " from " + this.name + " " + this.id + ", but user was not present");
			}
		}

		destroy() {
			console.log("Destroying " + this.name + " " + this.id);
			clearInterval(this.destroyIntervalID);
			delete List.Loc[this.name][this.id];
		}
	}


	return Game;
});
