/**********************************************
 * MediaPeek JavaScript                       *
 * Copyright 2016, James Halliday             *
 * FILEFINDER.JS                              *
 *********************************************/

var FILETYPE_NONE = 0;
var FILETYPE_PNG = 1;
var BYTESIZE = 256;
var localbytes;

/************************************************/
 * Called by main code to determine a file type *
 ************************************************/
function findFileType(theFile) {
    var reader = new FileReader();
    reader.onloadend = function(evt) {
        if (evt.target.readyState == FileReader.DONE) {
            localbytes = evt.target.result;
            processFileType();
        }
    };
    var end = BYTESIZE;
    if (end > theFile.size) {
        end = theFile.size;
    }
    var blob = theFile.slice(0, end);
    reader.readAsArrayBuffer(blob);
}

/***********************************************************
 * Called internally to read bytes and determine file type *
 ***********************************************************/
function processFileType() {
    var view = new DataView(localbytes);
    //PNG FILE CHECK
    if (theFile.size > 8) {
        var first32 = view.getUint32(0, true);
        var second32 = view.getUint32(4, true);
        if ((first32 == 1196314761) && (second32 == 169478669)) {
            triggerTreeBuild(FILETYPE_PNG);
            return;
        }
    }
    //DOESNT MATCH A TYPE - GIVE UP
    triggerTreeBuild(FILETYPE_NONE);
}