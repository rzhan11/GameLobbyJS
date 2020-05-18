define(function (require) {
	"use strict";

	var socket = io();

	// gets user id and location id
	var urlParams = new URLSearchParams(window.location.search);
	var myID = urlParams.get("id");
	if (myID.length < 1 || myID.length > 20) {
		var message = "Invalid name";
		window.location.href = "/error?message=" + message;
	}
	var myLocation = "room";
	var myLocationID = urlParams.get("locationID");

	// confirms connection with the server
	socket.emit("connectUserRequest", {
		id: myID,
		location: myLocation,
		locationID: myLocationID,
	});
	socket.once("connectUserResponse", function (data) {
		if (data.status == "Success") {
			console.log("Successfully connected to " + myLocation);
		} else {
			var message = data.status;
			window.location.href = "/error?message=" + message;
		}
	});


	// display users in this room
	var tableHeaders = "none";

	var userListDiv = document.getElementById("user-list-div");
	var userTable = document.getElementById("user-table");
	var userTableBody = document.createElement("tbody");
	userTable.appendChild(userTableBody);

	// display available and selected options
	var allGameSettings = "none";
	var roundSelect = document.getElementById("round-select");
	var timeSelect = document.getElementById("time-select");

	var myTeam = -1;
	var prevLobbyID = -1;
	socket.on("roomInfo", function (data) {
		// set up tableHeaders
		if (tableHeaders == "none") {
			tableHeaders = [];
			for (var i = 0; i < data.teams.length; i++) {
				tableHeaders.push("Team " + i);
			}
		}

		var tableBody = document.createElement("tbody");

		var cellWidth = (100 / Object.keys(tableHeaders).length) + "%";
		// top row
		var headRow = document.createElement("tr");
		for (var i = 0; i < tableHeaders.length; i++) {
			var th = document.createElement("th");
			th.style.width = cellWidth;
			th.appendChild(document.createTextNode(tableHeaders[i]));
			headRow.appendChild(th);
		}
		tableBody.append(headRow);

		// find my team
		for (var i = 0; i < data.teams.length; i++) {
			for (var j = 0; j < data.teams[i].length; j++) {
				if (myID == data.teams[i][j]) {
					myTeam = i;
				}
			}
		}
		// largest team size
		var maxTeamSize = data.maxUsersPerTeam.reduce((a, b) => Math.max(a, b));
		// body rows
		for (var i = 0; i < maxTeamSize; i++) {
			var tr = document.createElement("tr");
			for (var j = 0; j < data.teams.length; j++) {
				var td = document.createElement("td");
				if (i < data.maxUsersPerTeam[j]) {
					var str;
					td.style.width = cellWidth;
					if (i < data.teams[j].length) {
						str = data.teams[j][i];
						// check if this is my ID
						if (myID == data.teams[j][i]) {
							td.style.fontWeight = "bold";
							td.style.backgroundColor = "#00FF00";
							myTeam = j;
						}
					} else {
						if (j == myTeam) {
							str = "*";
						} else {
							str = "Switch to team " + j;
							td.style.fontStyle = "italic";
							td.classList.add("player-list-switch-cell");
							setOnClickSwitchTeam(td, j);
						}
					}
					td.appendChild(document.createTextNode(str));
				}
				tr.appendChild(td);
			}
			tableBody.appendChild(tr);
		}
		userTable.replaceChild(tableBody, userTableBody)
		userTableBody = tableBody;

		// update list of options and currently selected option
		if (allGameSettings == "none") {
			allGameSettings = data.ALL_GAME_SETTINGS;
			// sets up drop-down select options
			for (var setting in allGameSettings) {
				var selectElement = document.getElementById(setting + "-select");
				for (var i = 0; i < allGameSettings[setting].length; i++) {
					var op = document.createElement("option");
					op.text = allGameSettings[setting][i];
					selectElement.add(op);
				}
				setOnChangeGameSetting(selectElement, setting);
			}
		}
		// update drop-down menu to display currently selected option
		for (var setting in data.gameSettings) {
			var selectElement = document.getElementById(setting + "-select");
			selectElement.value = data.gameSettings[setting];
		}

		// save data on previous lobby
		prevLobbyID = data.lobbyID;
	});

	// separate method used to set the 'onclick' for switching teams
	function setOnClickSwitchTeam (td, teamID) {
		td.onclick = function () {
			switchTeam(teamID);
		}
	}

	function switchTeam(teamID) {
		if (myTeam == teamID) {
			window.alert("Cannot switch to your own team");
			return;
		} else {
			socket.emit("switchTeamRequest", {
				teamID: teamID,
			});
			socket.once("switchTeamResponse", function (data){
				if (data.status == "Success") {
					console.log("Successfully switched teams to " + teamID);
				} else {
					window.alert(data.status);
				}
			});
		}
	}

	// separate method used to set the 'onclick' for switching teams
	function setOnChangeGameSetting (selectElement, settingName) {
		selectElement.onchange = function () {
			changeGameSetting(settingName, selectElement.value)
		}
	}

	function changeGameSetting (name, value) {
		socket.emit("changeOption", {name: name, value: value});
	}

	// leave room button
	var backToLobbyButton = document.getElementById("back-to-lobby-button");
	backToLobbyButton.onclick = function () {
		window.location.href = "/lobby?id=" + myID + "&locationID=" + prevLobbyID;
	}

	var startGameButton = document.getElementById("start-game-button");
	startGameButton.onclick = function () {
		socket.emit("startGameRequest", {
			locationID: myLocationID,
		});
	}
	socket.on("startGameResponse", function (data){
		if (data.status == "Success") {
			window.location.href = "/game?id=" + myID + "&locationID=" + myLocationID;
		} else {
			window.alert(data.status);
		}
	});
});
