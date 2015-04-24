#!/usr/bin/env node

'use strict';

var bodyParser = require('body-parser');
var express = require('express');
var fs = require('fs');
var http = require('http');
var nativeMessage = require('chrome-native-messaging');

var waitingRequests = [];

function log(data) {
  fs.appendFileSync('/tmp/tab-server-host.log', data + '\n');
}

function messageHandler(msg, push, done) {
  // log('message: ' + JSON.stringify(msg));

  if (msg.response === 'windows') {
    var res = waitingRequests.pop();

    res.send(msg.windows);
  }

  done();
}

var input = new nativeMessage.Input();
var transform = new nativeMessage.Transform(messageHandler);
var output = new nativeMessage.Output();

process.stdin
  .pipe(input)
  .pipe(transform)
  .pipe(output)
  .pipe(process.stdout);

var app = express();

app.use(bodyParser.json());

app.get('/', function (req, res) {
  waitingRequests.push(res);

  output.write({command: 'windows'});
});

app.post('/', function (req, res) {
  output.write({
    command: 'focus',
    window: req.body.window,
    tab: req.body.tab
  });

  res.send({response: 'ok'});
});

log('Trying to listen on port 10000...');

var server = http.createServer(app);

server.on('listening', function () {
  log('Listening!');
});

server.on('error', function (err) {
  if (err.code === 'EADDRINUSE') {
    log('Retrying...');

    setTimeout(function () {
      server.close();
      server.listen(10000, '127.0.0.1');
    }, 1000);
  }
});

server.listen(10000, '127.0.0.1');
