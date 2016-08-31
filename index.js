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


app.post('/compile', function(req, res) {
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
                    _compileSession(hash, req.body.code, req.body.board, collection).then(function(result) {
                        res.send({
                            hex: result.hex
                        });
                        _updateCompiler(result.hex, result.hash, result.collection, function(err, updateResult) {
                            if (err) {
                                console.log(err);
                            } else {
                                //delete promiseMap[hash]
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
        console.log('ya tengo la promesa');
        return promiseMap[hash];
    } else {
        //create promise
        console.log('nueva promesa');
        return promiseMap[hash] = new Promise(function(resolve, reject) {
            //exec Compiler
            console.log('mando compilar');
            compile(code, board, function(err, hex) {
                if (err) {
                    reject(err);
                } else {
                    //setTimeout(function(){
                    resolve({hex: hex, hash: hash, collection: collection});
                    // }, 5000);
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


function compile(code, board, done) {
    console.log('A COMPILAR!!!!!');
    var hex;
    var path = config.basePath + 'pioWS_' + Date.now() + Math.floor(Math.random() * (1000 - 0 + 1) + 0) + '/';
    var compileErrors = [];
    exec('mkdir -p ' + path + 'src', function(error, stdout, stderr) {
        if (error) {
            console.error('exec error: ${error}');
            console.log(error);
        } else {
            async.parallel([
                fs.appendFile.bind(null, path + 'src/main.ino', code),
                exec.bind(null, 'ln -s ' + refPath + 'platformio.ini ' + path + 'platformio.ini'),
                exec.bind(null, 'ln -s ' + refPath + 'lib/ ' + path + 'lib')
            ], function(err, result) {
                console.log('Ha copiado todos los links necesarios main.ino y lib');
                if (err) {
                    console.error('exec error: ${error}');
                    console.log(error);
                } else {
                    var pio = spawn('pio', ['run', '-e', board, '-d', path]);
                    console.log('pio -> ' + pio);
                    pio.stderr.on('data', function(data) {
                        console.log('pio data ', data);
                        console.log(data);
                        compErr = errParser.parseError(data.toString('utf8'));
                        if (compErr !== []) {
                            console.log("compErr");
                            console.log(compErr);
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
