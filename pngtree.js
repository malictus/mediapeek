/**********************************************
 * MediaPeek JavaScript                       *
 * Copyright 2016, James Halliday             *
 * PNGTREE.JS                                 *
 *********************************************/

function buildPNGNodeTree(thefile) {
    if (thefile.size < 8) {
        return new FileNode(0, thefile.size, "Invalid file", [], "This file does not contain enough bytes to build a PNG header");
    }
    
    nodetree = new FileNode(0, 0, "ERE", [], "ERE");
    return nodetree;
}