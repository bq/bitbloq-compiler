/**
 * Created by tom on 01/08/16.
 */
const spawn = require('child_process').spawn;
const exec = require('child_process').exec;
const fs = require('fs');
const crypto = require('crypto');
var async = require('async');
var express = require('express');
var app = express();
var bodyParser = require('body-parser');
//var MongoClient = require('mongodb').MongoClient;
var db = require('./db');
const secret = 'oedjfgjkncfcijimpmgebklamobdioeg';


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


    var miniCode = req.body.code.replace(/(\r\n|\n|\r)/gm, '');
    var hash = crypto.createHmac('sha256', secret)
        .update(miniCode)
        .digest('hex');

    console.log("Connected correctly to server");
    console.log("req.body.board");
    console.log(req.body.board);
    var collection = db.get().collection(req.body.board);

    collection.findOne({
        _id: hash
    }, {}, function(err, doc) {
        if (err) {
            console.log(err.message);
        } else if (doc) {
            console.log("doc");
            console.log(doc);
            res.send(doc.value);

        } else {
            var hex = compile(req.body.code, req.body.board, function(err, hex) {
                res.send(hex);
                collection.update({
                        _id: hash,
                    }, {
                        $set: {
                            value: hex,
                            createdAt: new Date()
                        }
                    }, {
                        upsert: true
                    },
                    function(err, result) {
                        if (err) {
                            console.log(err);
                        } else {}

                    });
            });
        }
    });
    /*  var hex = compile(req.body.code, req.body.board, function(err, hex) {
          res.send(hex);
      });*/
});


function compile(code, board, done) {
    var hex;
    var path = basePath + 'pioWS_' + Date.now() + '/';
    exec('mkdir -p ' + path + 'src', function(error, stdout, stderr) {
        if (error) {
            console.error('exec error: ${error}');
        } else {
            async.parallel([
                fs.appendFile.bind(null, path + 'src/main.ino', code),
                exec.bind(null, 'ln -s ' + refPath + 'platformio.ini ' + path + 'platformio.ini'),
                exec.bind(null, 'ln -s ' + refPath + 'lib/ ' + path + 'lib')
            ], function(err, result) {
                if (err) {
                    console.error('exec error: ${error}');
                    done(err);
                } else {
                    var pio = spawn('pio', ['run', '-e', board, '-d', path]);
                    pio.on('close', function(exitCode) {
                        console.log('child process exited with code', exitCode);
                        fs.readFile(path + '.pioenvs/' + board + '/firmware.hex', 'utf8', function(err, contents) {
                            hex = contents;
                            done(err, hex);
                            exec('rm -r ' + path, function(error, stdout, stderr) {
                                if (error) {
                                    console.error('exec error: ${error}');
                                }
                            });
                        });
                    });
                }
            });
        }
    });
}


db.connect('mongodb://10.181.100.142:27017/hex', function(err) {
    if (err) {
        console.log('Unable to connect to Mongo.');
        process.exit(1);
    } else {
        app.listen(3000, function() {
            console.log('Listening on port 3000...');
        });
    }
});
