/**
 * Created by tom on 01/08/16.
 */


const spawn = require('child_process').spawn;
const exec = require('child_process').exec;
const fs = require('fs');
var async = require('async');
var express = require('express');
var app = express();
var bodyParser = require('body-parser');

var pioRun = [];

var i;
var basePath = '/home/platformio/';
var refPath = basePath + 'pioWS/';

var allowCrossDomain = function(req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');
    next();
};

app.use(allowCrossDomain);
app.use(bodyParser.json());

app.post('/compile', function(req, res) {
    compile(req.body.code, req.body.board);
    res.send('Got a POST request');
});


function compile(code, board) {
    var path = basePath + 'pioWS_' + Date.now() + '/';
    exec('mkdir -p ' + path + 'src', function(error, stdout, stderr) {
        if (error) {
            console.error('exec error: ${error}');
        } else {
          console.log('ln -s ' + refPath + 'platformio.ini ' + path + 'platformio.ini');
            async.parallel([
                fs.appendFile.bind(null, path + 'src/main.ino', code),
                exec.bind(null, 'ln -s ' + refPath + 'platformio.ini ' + path + 'platformio.ini'),
                exec.bind(null, 'ln -s ' + refPath + 'lib/ ' + path + 'lib')
            ], function(err, result) {
                if (error) {
                    console.error('exec error: ${error}');
                } else {
                    console.log(path);
                    pioRun=spawn('pio', ['run', '-e', board, '-d', path]);
                }
            });
        }
    });
}


app.listen(3000, function() {
    console.log('Example app listening on port 3000!');
});
