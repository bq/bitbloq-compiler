var compErrRegex = /(.*):([0-9]+):([0-9]+): (fatal error|error): (.*)/;
var refErrRegex = /(.*):([0-9]+): (.*)/;

// Auxiliar functions
function parseCompError(errorParts){
    var error = {};
    error['file'] = errorParts[1];
    error['line'] = errorParts[2];
    error['column'] = errorParts[3];
    error['error'] = errorParts[5].replace(/\\/g,"");
    return error;
}

function parseRefError(errorParts){
    var error = {};
    error['file'] = errorParts[1];
    error['line'] = errorParts[2];
    error['error'] = errorParts[3].replace(/\\/g,"");
    return error;
}

// Function you should call to parse the errors in the string returned
// by platformio
function parseError(errorStr){
    var errors = [];
    var errorParts = [];
    var lines = errorStr.split('\n');
    for (var i=0; i<lines.length; i++){
        if ( (errorParts = lines[i].match(compErrRegex)) != null ){
          errors.push(parseCompError(errorParts));
        }
        else if ( (errorParts = lines[i].match(refErrRegex)) != null ){
          errors.push(parseRefError(errorParts));
        }
    }
    return errors;
}

module.exports.parseError = parseError;
