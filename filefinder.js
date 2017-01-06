/**********************************************
 * MediaPeek                                  *
 * Copyright 2017, James Halliday             *
 * FILEFINDER.JS                              *
 *********************************************/

//each supported file type gets a constant here
var FILETYPE_NONE = 0;
var FILETYPE_PNG = 1;
//how many bytes to read to determine filetype
var BYTESIZE = 256;

/***************************
 * Determine a file's type *
 ***************************/
function findFileType() {
    var end = BYTESIZE;
    if (end > global_theFile.size) {
        end = global_theFile.size;
    }
    readFileSlice(0, end, global_theFile, processFileType);
}

/******************************************************************************
 * Callback to read bytes, determine file type, and trigger building the tree *
 ******************************************************************************/
function processFileType(localbytes) {
    var view = new DataView(localbytes);
    //PNG file check
    if (global_theFile.size > 8) {
        var first32 = view.getUint32(0, true);
        var second32 = view.getUint32(4, true);
        if ((first32 == 1196314761) && (second32 == 169478669)) {
            triggerTreeBuild(FILETYPE_PNG);
            return;
        }
    }
    //doesn't match a type; give up
    triggerTreeBuild(FILETYPE_NONE);
}
