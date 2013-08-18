digger-sockets
==============

A digger supplychain that connects via socket.io for pub/sub and optionally JQuery or angular or req/rep

## installation

	$ npm install digger-sockets

## usage

Using browserify you can connect to a backend digger reception server via socket.io

To build the module:

	$ browserify -r digger-sockets > bundle.js

Then on a web-page:

```html
<script src="bundle.js"></script>
<script>
	var SocketConnector = require('digger-sockets');

	// host is the url that is hosting the digger reception server
	var $digger = SocketConnector({
		host:'localhost'
	})

	// we now have a connection to the reception server - proceed to dig:

	var warehouse = $digger.connect('/my/backend/service');

	// load all tags that are .class with name starting with t (this is digger yo)
	warehouse('tag.class[name^=t]')
		.ship(function(tags){
			console.log('we have: ' + tags.count() + ' tags loaded');
		})
		.fail(function(error){
			// uh oh
		})
</script>
```

## JQuery and angular

If digger-sockets finds Jquery or angular on the page - it will use those as connectors for REQ/REP requests.

It will still use the socket for switchboard (realtime) requests.

## licence

MIT
