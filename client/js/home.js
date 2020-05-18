define(function (require) {
	"use strict";

	var socket = io();

	// gets default location id
	var defaultLobbyIDText = document.getElementById("default-lobby-id-text");
	var defaultLobbyID = defaultLobbyIDText.innerHTML;
	var defaultHomeID = 11;

	var usernameTextbox = document.getElementById("username-textbox");

	function enterLobby(id, lobbyID) {
		if (id.length < 1 || id.length > 20) {
			alert("Username must be between 1 and 20 characters");
			return;
		}
		if (id.trim() != id) {
			alert("Username cannot start or end with spaces");
			return;
		}
		socket.emit("connectUserRequest", {
			id: id,
			location: "home",
			locationID: defaultHomeID,
		});
		socket.once("connectUserResponse", function (data) {
			if (data.status == "Success") {
				window.location.href = "/lobby?id=" + id + "&locationID=" + defaultLobbyID;
			} else {
				alert(data.status);
			}
		});
	}

	// set focus on textbox
	usernameTextbox.focus();
	// prevent focus from being lost
	usernameTextbox.onblur = function(e) {
		usernameTextbox.focus();
	};

	// only allow letters, numbers, and spaces in username
	usernameTextbox.onkeydown = function (e) {
		var k = e.keyCode;
		// allows lowercase and capital letters
		if ((k >= 65 && k <= 90) || (k >= 95 && k <= 122)) {
			return true;
		}
		if (k >= 48 && k <= 57) { // allows numbers
			return true;
		}
		if (k == 32 || k == 8) { // allows space and backspace/delete
			return true;
		}
		if (k >= 36 && k <= 40) { // allows arrow keys
			return true;
		}
		return false;
	}

	document.addEventListener("keydown", (e) => {
		// pressing "enter" submits an event
		if (e.code == "Enter") {
			enterLobby(usernameTextbox.value, defaultLobbyID);
		}
	});
});
