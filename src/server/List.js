define(function (require) {
	"use strict";

	const requirejs = require("requirejs");

	class List {
	}

	List.Socket = {};
	List.User = {};
	List.Loc = {
		lobby: {},
		room: {},
		game: {},
	};

	return List;
});
