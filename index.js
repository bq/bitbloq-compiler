/**
 * Created by tom on 01/08/16.
 */
const spawn = require('child_process').spawn,
    exec = require('child_process').exec,
    fs = require('fs'),
    crypto = require('crypto'),
    Promise = require('promise');

var async = require('async'),
    express = require('express'),
    app = express(),
    bodyParser = require('body-parser'),
    config = require('./res/config.js'),
    db = require('./db'),
    errParser = require('./errorParser.js'),
    utils = require('./utils.js');


var refPath = config.basePath + 'pioWS/',
    promiseMap = [];

var allowCrossDomain = function(req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');
    next();
};

app.use(allowCrossDomain);
app.use(bodyParser.json());

app.get('/compile', function(req, res) {
    res.status(200).send('ok');
});

app.get('/status', function(req, res) {
    db.get().collection('status').findOne({}, function(err, appStatus) {
        if (err) {
            console.log(err);
            err.code = parseInt(err.code) || 500;
            res.status(err.code).send(err);
        } else {
            res.status(200).send(appStatus);
        }
    });
});
app.post('/compile', function(req, res) {
    if (req.body.code && req.body.board) {
        console.log('board:', req.body.board);
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
                    res.status(200).json({
                        hex: doc.value
                    });

                } else {
                    _compileSession(hash, req.body.code, req.body.board, collection).then(function(result) {
                        res.send({
                            hex: result.hex
                        });
                        _updateCompiler(result.hex, result.hash, result.collection, function(err) {
                            if (err) {
                                console.log(err);
                            } else {
                                delete promiseMap[hash];
                            }
                        });
                    }).catch(function(err) {
                        res.status(200).json({
                            error: err
                        });
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

function _compileSession(hash, code, board, collection) {
    //find hash promise
    if (promiseMap[hash]) {
        return promiseMap[hash];
    } else {
        //create promise
        return promiseMap[hash] = new Promise(function(resolve, reject) {
            //exec Compiler
            compile(code, board, hash, function(err, hex) {
                if (err) {
                    reject(err);
                } else {
                    resolve({
                        hex: hex,
                        hash: hash,
                        collection: collection
                    });
                }
            });
        });
    }
}

function _updateCompiler(hex, hash, collection, next) {
    collection.update({
        _id: hash
    }, {
        $set: {
            value: hex,
            createdAt: new Date()
        }
    }, {
        upsert: true
    }, next);
}


function compile(code, board, hash, done) {
    var hex;
    var path = config.basePath + 'pioWS_' + hash + '/';
    var compileErrors = [];
    exec('mkdir -p ' + path + 'src', function(error, stdout, stderr) {
        if (error) {
            console.error('exec error: ${error}');
            console.log(error);
        } else {
            console.log(refPath);
            console.log(path);
            async.parallel([
                fs.appendFile.bind(null, path + 'src/main.ino', code),
                exec.bind(null, 'ln -s ' + refPath + 'platformio.ini ' + path + 'platformio.ini'),
                exec.bind(null, 'ln -s ' + refPath + 'lib/ ' + path + 'lib')
            ], function(err, result) {
                if (err) {
                    console.error('exec error: ', err);
                    console.log(error);
                } else {
                    console.log('hop', 'pio run -e ' + board + ' -d ' + path);
                    var pio = spawn('pio', ['run', '-e', board, '-d', path]);
                    pio.stderr.on('data', function(data) {
                        console.log('stderror', data.toString('utf8'));
                        compErr = errParser.parseError(data.toString('utf8'));
                        if (compErr !== []) {
                            compileErrors = compileErrors.concat(compErr);
                        }
                    });
                    pio.stdout.on('data', function(data) {
                        console.log('stdout', data.toString('utf8'));
                    });
                    pio.on('error', (err) => {
                        console.log('Failed to start child process.', err);
                        done(err);
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
        console.log('Unable to connect to Mongo.', err);
        process.exit(1);
    } else {
        app.listen(config.port, function() {
            console.log('Listening on port 3000...');
        });
    }
});
