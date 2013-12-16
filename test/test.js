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
var DiggerServe = require('digger-serve');
var ServerSocket = require('../src/server');
var DiggerRadio = require('digger-radio');
var phantom = require('phantom');

describe('digger sockets', function(){
	var browser, server, website, sockets, radio, serverstatus;

  before(function (done) {
    this.timeout(5000);

    serverstatus = {};

    phantom.create(function (ph) {
      ph.createPage(function (tab) {

        browser = tab;
        
      	var port = process.env['DIGGER_APP_PORT'] || 8791;
				var DiggerServe = require('digger-serve');

				server = new DiggerServe();
        sockets = new ServerSocket();
        radio = new DiggerRadio();

				website = server.website({
					document_root:__dirname,
					domains:'*',
					session:true,
					parser:true,
					debug:true,
					cors:true
				})

        website.app.get('/build/build.js', function(req, res){
          res.sendfile(__dirname + '/../build/build.js');
        })

        sockets.connect(server.http);

        sockets.on('request', function(req, reply){
          req.url.should.equal('/apples');
          reply(null, [{
            _digger:{
              diggerwarehouse:'/apples',
              diggerpath:[10,20]
            },
            name:'test',
            value:10
          }])
        })

        sockets.on('connection', function(socket){
          serverstatus.connected = true;
        })

        sockets.on('radio', function(action, channel, packet){
          serverstatus.radio = {
            action:action,
            channel:channel,
            packet:packet
          }
          radio[action].apply(radio, [channel, packet]);
        })

        setTimeout(function(){
          server.listen(port, function(){
            console.log('test server listening');
            done();
          })  
        })

				
      })
    })
  })

  it('should render a webpage', function (done) {

    this.timeout(3000);

    browser.open('http://localhost:8791/test.html', function (status) {

      setTimeout(function () {
        browser.evaluate(function inBrowser() {
          // this will be executed on a client-side
          return window._test
        }, function fromBrowser(_test) {
          _test.connected.should.equal(true);
          
          _test.results.length.should.equal(1);
          _test.results[0]._digger.diggerwarehouse.should.equal('/apples');
          
          serverstatus.connected.should.equal(true);
          serverstatus.radio.action.should.equal('talk');
          serverstatus.radio.channel.should.equal('pears');
          serverstatus.radio.packet.should.equal(10);
          done();
        });
      }, 1000)

    });
  });

})


