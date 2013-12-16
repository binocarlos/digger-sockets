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
var sockjs = require('sockjs');

/*

	a client has connected their socket to the web app

	we proxy digger requests back to the reception socket handler
*/
module.exports = function(fn){

	var self = this;

  var sockets = sockjs.createServer();
  var sockets.on('connection', function(socket){
    self.emit('socket_connection', socket);
  });

  sockets.install = function(httpserver, opts){
    opts = opts || {};
    sockets.installHandlers(httpserver, {prefix:opts.socketpath || '/digger/sockets'});  
  }
  
  return sockets;


	return function(socket){

		// the local functions we have registered with the radio
		var listeners = {};
		var user = null;

		socket.on('data', function(payload) {
      
      /*
      
      	this has to be a strict mapping of fields
      	because things like internal give the request upgraded permissions
      	
      */
      payload = JSON.parse(payload);

      /*
      
      	run a backend warehouse request that has come from a client socket
      	
      */
      if(payload.type==='request'){

      	var req = payload.data;

        var headers = req.headers || {};

        if(user){
          headers['x-json-user'] = user;
        }

      	self.connector({
	      	id:req.id,
	        method:req.method,
	        url:req.url,
	        query:req.query,
	        headers:headers,
	        body:req.body
	      }, function(error, results){

	      	if(!socket){
	      		return;
	      	}
	      	
	        socket.write(JSON.stringify({
	        	type:'response',
	        	data:{
	        		id:req.id,
		          error:error,
		          results:results	
	        	}
	        }))

	        req = null;
	        payload = null;
     		})

      }
      /*
      
      	register client user based on token
      	(well - it will be based on token)
      	
      */
      else if(payload.type=='auth'){
        var data = payload.data;
        var sessionid = data.sessionid;

        self.redisStore.get(sessionid, function(error, data){
          var auth = data.auth || {};
          var sessionuser = auth.loggedIn ? auth.user : null;

          if(sessionuser){
            user = sessionuser;
          }

          socket.write(JSON.stringify({
            type:'auth',
            data:{}
          })) 
        })

      }
      /*
      
      	run a radio request from a client socket
      	
      */
      else if(payload.type=='radio'){

      	var req = payload.data;

      	if(req.action=='talk'){
      		self.radio('talk', req.channel, req.payload);
      	}
      	else if(req.action=='listen'){
      		if(listeners[req.channel]){
      			return;
      		}

      		self.radio('talk', 'subscribe.' + req.channel, {
      			id:socket.id,
      			user:user
      		})

      		var listener = listeners[req.channel] = function(channel, data){

      			process.nextTick(function(){
              if(!socket){
                return;
              }
              
      				socket.write(JSON.stringify({
			        	type:'radio',
			        	data:{
			        		channel:channel,
			        		payload:data
			        	}
			        }))	
      			})

      			
      		}

      		self.radio('listen', req.channel, listener);
      	}
      	else if(req.action=='cancel'){
      		var listener = listeners[req.channel];
      		self.radio('cancel', req.channel, listener);
      		delete(listeners[req.channel]);
      	}

      }
      /*
      
      	unknown socket message
      	
      */
      else{
      	socket.write(JSON.stringify({
        	type:'error',
        	data:'unknown payload type: ' + payload.type
        }))
      }

    })

    socket.on('close', function(){
    	for(var key in listeners){
    		var listener = listeners[key];
      	self.radio('cancel', key, listener);
      	self.radio('talk', 'unsubscribe.' + key, {
    			id:socket.id,
    			user:user
    		})
    	}
    	socket = null;
    	user = null;
    	listeners = null;
    })

  }
      
}