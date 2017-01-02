/**********************************************
 * MediaPeek JavaScript                       *
 * Copyright 2016, James Halliday             *
 * FILEFINDER.JS                              *
 *********************************************/

var FILETYPE_NONE = 0;
var FILETYPE_PNG = 1;
var BYTESIZE = 256;

/************************************************
 * Called by main code to determine a file type *
 ************************************************/
function findFileType(theFile) {
    var end = BYTESIZE;
    if (end > theFile.size) {
        end = theFile.size;
    }
    readFileSlice(0, end, theFile, processFileType);
}

/***********************************************************
 * Called internally to read bytes and determine file type *
 ***********************************************************/
function processFileType(localbytes) {
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
