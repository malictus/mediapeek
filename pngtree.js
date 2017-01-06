/**********************************************
 * MediaPeek                                  *
 * Copyright 2017, James Halliday             *
 * PNGTREE.JS                                 *
 *********************************************/

//this is the callback function that calls when finished
var finishtreebuild;

/******************************************
 * Build the nodetree based on a PNG file *
 * and trigger callback when complete     *
 ******************************************/
function buildPNGNodeTree(treecallback) {
    finishtreebuild = treecallback;
    //read header from beginning of file
    readFileSlice(0, 512, global_theFile, processfilebeginning);
}

/***************************************
 * Process the first 512 bytes of PNG  *
 ***************************************/
function processfilebeginning(beginbytes) {
    if (beginbytes.size < 8) {
        global_nodetree = new FileNode(0, global_theFile.size, "Invalid file", "File is invalid", [], "This file does not contain enough bytes to build a PNG header");
        finishtreebuild();
    }
    //read PNG header
    var view = new DataView(global_theBytes);
    var first32 = view.getUint32(0, true);
    var second32 = view.getUint32(4, true);
    if ((first32 != 1196314761) || (second32 != 169478669)) {
        global_nodetree = new FileNode(0, global_theFile.size, "Invalid file", "File is invalid", [], "This file does not start with the 8-byte PNG signature");
        finishtreebuild();
    }
    //begin building returnnode
    global_nodetree = new FileNode(0, global_theFile.size, "PNG Image File", "PNG (Portable Network Graphics) File", []);
    //add PNG header node
    global_nodetree.children.push(new FileNode(0, 8, "PNG Header", "An 8-byte header. Every PNG file starts with this header.", []));
    //finished - return the node
    finishtreebuild();
}