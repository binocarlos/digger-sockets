/*

	(The MIT License)

	Copyright (C) 2005-2013 Kai Davenport

	Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

	The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

 */

/*

	the channels we are listening to
	
*/
var EventEmitter2 = require('eventemitter2').EventEmitter2;
var util = require('util');

module.exports = function(){
	var radio = new EventEmitter2({
    wildcard: true
  })

  var channels = new EventEmitter2({
    wildcard: true
  })

  radio.talk = function(channel, body){
  	radio.emit('talk', channel, body);
  }

  radio.listen = function(channel, fn){
  	if(!fn){
			fn = channel;
			channel = '*';
		}
		channel = (channel===null || channel==='') ? '*' : channel;
		channels.on(channel==='*' ? '_all' : channel, fn);
  	radio.emit('listen', channel);
  }

  radio.cancel = function(channel, fn){
  	var emitterkey = channel==='*' ? '_all': channel;

		if(fn){
			radio.off(emitterkey, fn);
		}
		else{
			radio.removeAllListeners(emitterkey);	
		}
		var listeners = radio.listeners(emitterkey);
		if(listeners.length<=0){
			radio.emit('cancel', channel.replace(/\*$/, ''));
		}
  }

  radio.receive = function(channel, body){
		channels.emit(channel, body, channel);
		channels.emit('_all', body, channel);
  }

  return radio;

}