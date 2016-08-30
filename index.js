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
var config = require('./res/config.js');
var db = require('./db');
var errParser = require('./errorParser.js');
var utils = require('./utils.js');


var refPath = config.basePath + 'pioWS/';

var allowCrossDomain = function(req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');
    next();
};

app.use(allowCrossDomain);
app.use(bodyParser.json());

app.post('/compile', function(req, res) {
    console.log("req.body.number is : ", req.body.number);
    if (req.body.code && req.body.board) {
        console.log(utils.checkBoardType(req.body.board));
        if (utils.checkBoardType(req.body.board)) {
            var miniCode = req.body.code.replace(/(\r\n|\n|\r)/gm, '');
            var hash = crypto.createHmac('sha256', config.secret)
                .update(miniCode)
                .digest('hex');

            console.log("Connected correctly to server");

            var collection = db.get().collection(req.body.board);

            collection.findOne({
                _id: hash
            }, {}, function(err, doc) {
                if (err) {
                    console.log(err.message);
                } else if (doc) {
                    console.log("doc");
                    console.log(doc);
                    res.status(200).json({
                        hex: doc.value
                    });

                } else {
                    var hex = compile(req.body.code, req.body.board, req.body.number, function(err, hex) {
                        if (err) {
                            res.status(200).json({
                                error: err
                            });
                        } else {
                          console.log("he completado bien la peticion: ", req.body.number);
                            res.send({
                                hex: hex
                            });
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
                        }
                    });
                }
            });
        } else {
            res.status(400).send('No compatible type of board');
        }
    } else {
        res.status(400).send('Missing board or code');
    }
});


function compile(code, board, number, done) {
    var hex;
    var path = config.basePath + 'pioWS_' + Date.now() + Math.floor(Math.random() * (100 - 0 + 1) + 0) + '/';
    var compileErrors = [];
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
                } else {
                    var pio = spawn('pio', ['run', '-e', board, '-d', path]);
                    pio.stderr.on('data', function(data) {
                        console.log(data);
                        compErr = errParser.parseError(data.toString('utf8'));
                        if (compErr !== []) {
                            compileErrors = compileErrors.concat(compErr);
                        }
                    });
                    pio.on('close', function(exitCode) {
                        if (exitCode === 0) {
                            fs.readFile(path + '.pioenvs/' + board + '/firmware.hex', 'utf8', function(err, contents) {
                                hex = contents;
                                done(null, hex);
                                deletePath(path);
                            });
                        } else {
                            console.log('exit code:', exitCode);
                            console.log(compileErrors);
                            done(compileErrors);
                            deletePath(path);
                        }
                    });
                }
            });
        }
    });
}

function deletePath(path) {
    exec('rm -r ' + path, function(error, stdout, stderr) {
        if (error) {
            console.error('exec error: ${error}');
        }
    });
}


db.connect(config.mongo.uri, function(err) {
    if (err) {
        console.log('Unable to connect to Mongo.');
        process.exit(1);
    } else {
        app.listen(config.port, function() {
            console.log('Listening on port 3000...');
        });
    }
});
