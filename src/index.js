/*

	(The MIT License)

	Copyright (C) 2005-2013 Kai Davenport

	Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

	The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

 */

/**
 * Module dependencies.
 */

var utils = require('digger-utils');
var Client = require('digger-client');
//var Sockets = require('socket.io-client');

var Blueprint = require('./blueprints');
var Template = require('./templates');
var Radio = require('./radio');

/*

	we construct the global $digger using this factory function

	we pass it the environment options such as:

		hostname of the digger server (to connect the socket to)
	
*/
module.exports = function(config){

	config = config || {};

	// the object we return
	var $digger;

	if(config.debug){
		console.log('-------------------------------------------');
		console.log('-------------------------------------------');
		console.log('CONFIG');
		console.dir(config);	
	}
	
	var socket = new SockJS('//' + (config.host || 'localhost') + '/digger/sockets');



	/*
	
		requests issued before we had a socket connection or our other transport was ready
		
	*/
	var request_buffer = [];
	var socketconnected = false;
	var callbacks = {};

	function disconnected_handler(req, reply){
		request_buffer.push({
			req:req,
			reply:reply
		})
	}

	function padding(offset){
		offset = offset || 0;
		var st = '';
		for(var i=0; i<offset; i++){
			st += '    ';
		}
		return st;
	}

	function is_contract(req){
		return req.url=='/reception' && req.method=='post';
	}

	function log_contract(contract, offset){
		console.log(padding(offset) + '-------------------------------------------');
		console.log(padding(offset) + 'contract: ' + contract.headers['x-contract-type']);
		offset++;
		var summary = [];
		(contract.body || []).forEach(function(child){
			summary.push(log_request(child, offset));
		})
		return 'contract: ' + summary.join(' ' + contract.headers['x-contract-type'] + ' ');
	}

	function log_warehouse_request(req, offset){
		var extra = '';
		if(req.headers['x-json-selector']){
			var selector = req.headers['x-json-selector'];
			extra = ' - select: ' + selector.string;
		}
		var summary = 'request: ' + req.method + ' ' + req.url + extra;
		console.log(padding(offset) + '-------------------------------------------');
		console.log(padding(offset) + summary);

		return summary;
	}

	function log_request(packet, offset){
		offset = offset || 0;
		var summary = '';
		if(is_contract(packet)){
			summary = log_contract(packet, offset);
		}
		else{
			summary = log_warehouse_request(packet, offset);
		}
		return summary;
	}

	function log_response_factory(summary){
		return function(answer){
			var extra = '';
			if(answer.error){
				extra = 'ERROR: ' + answer.error;
			}
			else{
				extra = summary;
			}
			console.log('-------------------------------------------');
			console.log('ANSWER');
			console.log(extra);
			console.log('-------------------------------------------');
			console.dir(answer.results);
			console.log('-------------------------------------------');	
		}
	}

	function clear_buffer(){
  	var usebuffer = [].concat(request_buffer);
		usebuffer.forEach(function(buffered_request){
  		run_socket(buffered_request.req, buffered_request.reply);
  	})
  	
  	request_buffer = [];
	}


	function connected_handler(req, reply){

		if(!req || !req.url || !req.method){
			throw new Error('req must have a url and method');
		}
		
		/*
		
			------------------------------------------------------
			------------------------------------------------------
			------------------------------------------------------
			------------------------------------------------------
			------------------------------------------------------

			THIS IS A TERRIBLE HACK

			I have changed to sockjs - defo a good idea coz it aint
			bloatware like socket.io

			However - and another good thing - we have lost the old
			(very hacky) way of accessing the cookie from the handsake
			of the socket

			So - the solution is to have OAuth Access tokens working
			alongside cookie logins

			A session can have the OAuth tokens and so those can be
			written to the page and then they can be submitted to the socket

		*/
		var headers = req.headers || {};

		if(config.user){
			headers['x-json-user'] = config.user;
		}

		var http_req = {
			id:utils.littleid(),
			method:req.method,
			url:req.url,
			headers:headers,
			body:req.body
		}

		var log_response = null;

		if($digger.config.debug){
			log_response = log_response_factory(log_request(req));
		}

		callbacks[http_req.id] = function(answer){

			/*
			
				the socket handler bundles the error and answer into a single object
				
			*/
			var error = answer.error;
			var results = answer.results;

			reply(error, results);

			if($digger.config.debug){
				log_response(answer);
			}

			delete(callbacks[http_req.id]);
		}
		
		socket.send(JSON.stringify({
			type:'request',
			data:http_req
		}))
	}

	function socket_answer(payload){
		payload = payload.toString();
		payload = JSON.parse(payload);

		if(payload.type=='response'){
			var answer = payload.data;
			var id = answer.id;
			var callback = callbacks[id];
			if(callback){
				callback(answer);
			}	
		}
		else if(payload.type=='radio'){

			var packet = payload.data;

			// pipe the packet into the radio
			$digger.radio.receive(packet.channel, packet.body);
		}
		else if(payload.type=='error'){
			console.error('socket error: ' + payload.error);
		}
		else{
			console.error('unknown payload type: ' + payload.type);	
		}
	}

	function run_socket(req, reply){
		if(socketconnected){
			connected_handler(req, reply);
		}
		else{
			disconnected_handler(req, reply);
		}
	};

  socket.onopen = function() {
    if(config.debug){
    	console.log('socket connected');
    }
    socketconnected = true;
    $digger.emit('connect');
    setTimeout(clear_buffer, 10);
  };

  // start off with the message buffer
  socket.onmessage = function(e){
  	if(e.type==='message'){
  		socket_answer(e.data);
  	}
  }
  
  // close
  socket.onclose = function() {
    if(config.debug){
    	console.log('socket disconnected');
    }

    socketconnected = false;
    $digger.emit('disconnect');
  };

	/*
	
		the main handle function that connects the front end supplychain with the backend reception server

		we study the page to see if we have a JQuery or angular on the page

		if we do - then our requests go via the XHR or them

		otherwise we run our requests through the socket

		in all cases the portals run via the socket
		
	*/
	$digger = Client(run_socket);

	$digger.config = config;
	$digger.user = config.user;
	$digger.blueprint = Blueprint();
	$digger.template = Template();
	$digger.radio = Radio();

	/*
	
		write the radio broadcast down the wire

		$digger.radio.recieve(packet.channel, packet.);

		^^^^^^ this is up in the generic socket reciever
		
	*/
	$digger.radio.on('talk', function(channel, payload){
		socket.send(JSON.stringify({
			type:'radio:talk',
			data:{
				channel:channel,
				body:body
			}
		}))
	})

	$digger.radio.on('listen', function(channel, payload){
		socket.send(JSON.stringify({
			type:'radio:listen',
			data:channel
		}))
	})

	$digger.radio.on('cancel', function(channel, payload){
		socket.send(JSON.stringify({
			type:'radio:cancel',
			data:channel
		}))
	})



	/*
	
		we have been given some blueprints to automatically load
		
	
	if(config.blueprints){
		setTimeout(function(){
			var blueprintwarehouse = $digger.connect(config.blueprints);
			blueprintwarehouse('*')
				.ship(function(blueprints){
					blueprints.find('blueprint').each(function(blueprint){
	          $digger.blueprint.add(blueprint);
	        })
				})
		})
	}
	*/
	return $digger;
}