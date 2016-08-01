/**
 * Created by tom on 01/08/16.
 */


 const spawn = require('child_process').spawn;
 const exec = require('child_process').exec;
 const fs = require('fs');
 const async = require('async');

 var pioRun = [];

 var i;
 var basePath = '/home/platformio/';
 var refPath = basePath + 'pioWS/';

 var code = [];
 code[0] = "void setup(){};void loop(){}";
 code[1] = "void setup(){pinMode(8, OUTPUT);};void loop(){digitalWrite(8, HIGH);}";

 for (i = 0; i<2; i++){
   compile(code[i], 'uno', i);

 }

 function compile(code, board, i){
   var path = basePath + 'pioWS_' +i+ '/';
   exec('mkdir -p ' + path + 'src', function(error, stdout, stderr){
     if (error) {
       console.error('exec error: ${error}');
     } else{
       async.parallel([
         fs.appendFile.bind(null, path+'src/main.ino', code),
         exec.bind(null, 'ln -s ' + refPath + 'platformio.ini ' + path + 'platformio.ini'),
         exec.bind(null, 'ln -s ' + refPath + 'lib/ ' + path + 'lib')
       ],function(err, result){
           if (error) {
             console.error('exec error: ${error}');
           } else{
             console.log(path);
               spawn('pio', ['run', '-e', board, '-d', path]);
           }
       })
     }
   });
 }
