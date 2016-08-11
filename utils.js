
var boards = require('./boards.js');
/**
 * Transform Array Buffer in String
 * @param {Array Buffer} buf
 * @return {String} decodeURIComponent(encodedString)
 */
module.exports.checkBoardType = function(board) {
  var boardCorrect;
  if (boards.getBoards.indexOf(board) > -1) {
    boardCorrect = true;
  } else {
    boardCorrect = false;
  }

  return boardCorrect;
};
