/**********************************************
 * MediaPeek JavaScript                       *
 * Copyright 2016, James Halliday             *
 * PNGTREE.JS                                 *
 *********************************************/

//this is the callback function
var finishtreebuild;
//this is the filenode that we will return when done
var returnnode;

/******************************************
 * Build the nodetree based on a PNG file *
 ******************************************/
function buildPNGNodeTree(thefile, treecallback) {
    finishtreebuild = treecallback;
    //read header from beginning of file
    readFileSlice(0, 512, theFile, processfilebeginning);
}

/***************************************
 * Process the first 512 bytes of PNG  *
 ***************************************/
function processfilebeginning(beginbytes) {
    if (beginbytes.size < 8) {
        finishtreebuild(new FileNode(0, thefile.size, "Invalid file", [], "This file does not contain enough bytes to build a PNG header"));
    }
    //read PNG header
    var view = new DataView(theBytes);
    var first32 = view.getUint32(0, true);
    var second32 = view.getUint32(4, true);
    if ((first32 != 1196314761) || (second32 != 169478669)) {
        finishtreebuild(new FileNode(0, thefile.size, "Invalid file", [], "This file does not start with the 8-byte PNG signature"));
    }
    //begin building returnnode
    returnnode = new FileNode(0, thefile.size, "PNG Image File", []);
    //add PNG header node
    returnnode.children.push(new FileNode(0, 8, "8-byte PNG Image Header", []));
    //finished - return the node
    finishtreebuild(returnnode);
}