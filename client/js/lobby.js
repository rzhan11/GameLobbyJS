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
	var myLocation = "lobby";
	var myLocationID = urlParams.get("locationID");

	// confirms connection with the server
	socket.emit("connectUserRequest", {
		id: myID,
		location: myLocation,
		locationID: myLocationID,
	});
	socket.once("connectUserResponse", function (data) {
		if (data.status == "Success") {
			console.log("Successfully connected to " + myLocation)
		} else {
			var message = data.status;
			window.location.href = "/error?message=" + message;
		}
	});

	// change username
	var changeUsernameButton = document.getElementById("change-username-button");
	changeUsernameButton.onclick = function () {
		window.location.href = "/";
	}


	// create room
	var createRoomButton = document.getElementById("create-room-button");
	createRoomButton.onclick = createRoom;

	function createRoom () {
		socket.emit("createRoomRequest", {
		});
		socket.once("createRoomResponse", function (data){
			if (data.status == "Success") {
				window.location.href = "/room?id=" + myID + "&locationID=" + data.locationID;
			} else {
				window.alert(data.status);
			}
		});
	}

	// refresh rooms
	var refreshRoomButton = document.getElementById("refresh-room-button");
	refreshRoomButton.onclick = refreshRoom;

	function refreshRoom() {
		socket.emit("refreshRoomRequest", {});
	}

	// join room
	var tableHeaders = {
		id: "Room Code",
		numUsers: "Number of Users",
		maxUsers: "Max Users",
	};

	var numUsersText = document.getElementById("num-users-text");
	var roomListDiv = document.getElementById("room-list-div");
	var roomTable = document.getElementById("room-table");
	var roomTableBody = document.createElement("tbody");
	roomTable.appendChild(roomTableBody);

	socket.on("lobbyInfo", function (data) {
		var tableBody = document.createElement("tbody");

		var cellWidth = (100 / Object.keys(tableHeaders).length) + "%";
		// top row
		var headRow = document.createElement("tr");
		for (var key in tableHeaders) {
			var th = document.createElement("th");
			th.style.width = cellWidth;
			th.appendChild(document.createTextNode(tableHeaders[key]));
			headRow.appendChild(th);
		}
		tableBody.append(headRow);

		// body rows
		for (var roomID in data.rooms) {
			var room = data.rooms[roomID];
			var tr = document.createElement("tr");
			tr.classList.add("room-list-row");
			for (var key in tableHeaders) {
				var td = document.createElement("td");
				td.style.width = cellWidth;
				td.appendChild(document.createTextNode(room[key]));
				tr.appendChild(td);
			}
			setOnClickJoinRoom(tr, room.id);
			tableBody.appendChild(tr);
		}

		roomTable.replaceChild(tableBody, roomTableBody)
		roomTableBody = tableBody;

		numUsersText.innerHTML = "Users in lobby: " + data.numUsers;
	});

	// separate method used to set the 'onclick' for switching teams
	function setOnClickJoinRoom (tr, roomID) {
		tr.onclick = function () {
			joinRoom(roomID);
		}
	}

	function joinRoom(roomID) {
		socket.emit("joinRoomRequest", {
			locationID: roomID,
		});
		socket.once("joinRoomResponse", function (data){
			if (data.status == "Success") {
				window.location.href = "/room?id=" + myID + "&locationID=" + roomID;
			} else {
				window.alert(data.status);
			}
		});
	}

});
