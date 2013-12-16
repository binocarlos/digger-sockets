/*

	(The MIT License)

	Copyright (C) 2005-2013 Kai Davenport

	Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

	The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

 */

/*
  Module dependencies.
*/

var EventEmitter = require('events').EventEmitter;
var util = require('util');
var utils = require('digger-utils');
var SockJS = require('./sockjs-client');
var Spartans = require('holdspartans');

module.exports = BrowserSocket;

function BrowserSocket(url){
	EventEmitter.call(this);
	
	this.callbacks = {};
	this.queue = new Spartans();

	this.socket = this.create_socket(url);
}

util.inherits(BrowserSocket, EventEmitter);

BrowserSocket.prototype.create_socket = function(url){
	var self = this;
	//protocol + '//' + (config.host || 'localhost') + '/digger/sockets'
	var socket = new SockJS(url);

	socket.onopen = function() {
    self.emit('connect');
    self.queue.hold(false);
  };

  // start off with the message buffer
  socket.onmessage = function(e){
  	if(e.type=='message'){
  		self.read(e.data);
  	}
  }
  
  // close
  socket.onclose = function() {
    self.emit('disconnect');
    self.queue.hold(true);
  };

	return socket;
}

BrowserSocket.prototype.send = function(packet){
	var self = this;
	this.queue.add(function(){
		self.socket.send(typeof(packet)==='string' ? packet : JSON.stringify(packet));
	})
}

BrowserSocket.prototype.read = function(payload){
	var self = this;
	payload = payload.toString();
	payload = JSON.parse(payload);

	if(payload.type=='response'){
		var answer = payload.data;
		var id = answer.id;
		var callback = self.callbacks[id];
		if(callback){
			callback(answer);
		}
	}
	else if(payload.type=='auth'){
		socket_is_ready();
	}
	else if(payload.type=='radio'){

		var packet = payload.data;

		// pipe the packet into the radio
		$digger.radio.receive(packet.channel, packet.payload);
	}
	else if(payload.type=='error'){
		console.error('socket error: ' + payload.error);
	}
	else{
		console.error('unknown payload type: ' + payload.type);	
	}
}

BrowserSocket.prototype.request = function(req, reply){
	var self = this;
	var headers = req.headers || {};
	var http_req = {
		id:utils.littleid(),
		method:req.method,
		url:req.url,
		headers:headers,
		body:req.body
	}

	this.callbacks[http_req.id] = function(answer){

		/*
		
			the socket handler bundles the error and answer into a single object
			
		*/
		var error = answer.error;
		var results = answer.results;

		reply(error, results);

		delete(self.callbacks[http_req.id]);
	}

	this.send({
		type:'request',
		data:http_req
	})
}

BrowserSocket.prototype.radio = function(action, channel, packet){
	this.send({
		type:'radio',
		data:{
			action:action,
			channel:channel,
			payload:typeof(packet)!=='function' ? packet : null
		}
	})
}