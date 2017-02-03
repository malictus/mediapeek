/**********************************************
 * MediaPeek                                  *
 * Copyright 2017, James Halliday             *
 * PNGTREE.JS                                 *
 *********************************************/

//this is the callback function that calls when finished
var finishtreebuild;
//keeps track of where the currently read chunk starts
var curChunkStart;
//array of text chunks for file reading
var textChunks = [];
//keep track of which text chunk we're reading
var curtextchunk = 0;

/******************************************
 * Build the nodetree based on a PNG file *
 * and trigger callback when complete     *
 ******************************************/
function buildPNGNodeTree(treecallback) {
    finishtreebuild = treecallback;
    textChunks = [];
    curtextchunk = 0;
    //read header from beginning of file
    readFileSlice(0, 8, global_theFile, processfilebeginning);
}

/***************************************
 * Process the first 8 bytes of PNG  *
 ***************************************/
function processfilebeginning(beginbytes) {
    if (beginbytes.size < 8) {
        global_nodetree = new FileNode(0, global_theFile.size, "Invalid file", "File is invalid", [], "This file does not contain enough bytes to build a PNG header");
        finishtreebuild();
        return;
    }
    //read PNG header
    var view = new DataView(beginbytes);
    var first32 = view.getUint32(0, true);
    var second32 = view.getUint32(4, true);
    if ((first32 != 1196314761) || (second32 != 169478669)) {
        global_nodetree = new FileNode(0, global_theFile.size, "Invalid file", "File is invalid", [], "This file does not start with the 8-byte PNG signature");
        finishtreebuild();
        return;
    }
    //begin building returnnode
    global_nodetree = new FileNode(0, global_theFile.size, "PNG Image File", "PNG (Portable Network Graphics) File", []);
    //add PNG header node
    global_nodetree.children.push(new FileNode(0, 8, "PNG Header", "An 8-byte header. Every PNG file starts with this header.", []));
    //read all the chunks until done
    curChunkStart = 8;
    readNextChunk();
}

/********************
 * Read a PNG chunk *
 ********************/
function readNextChunk() {
    readFileSlice(curChunkStart, curChunkStart + 8, global_theFile, processChunk);
}

/***********************
 * Process a PNG chunk *
 ***********************/
function processChunk(chunkHeader) {
    var view = new DataView(chunkHeader);
    if (chunkHeader.size < 1) {
        //dunno why this might happen
        finishtreebuild();
        return;
    }
    if (chunkHeader.size < 8) {
        //EOF reached prematurely
        global_nodetree.children.push(new FileNode(curChunkStart, chunkHeader.size, "Invalid chunk", "Invalid chunk.", [], "End-of-file reached prematurely"));
        finishtreebuild();
        return;
    }
    var length = view.getUint32(0, false);
    var chunkname = readAlphaChunk(chunkHeader.slice(4, 8));
    if (length < 0) {
        global_nodetree.children.push(new FileNode(curChunkStart, chunkHeader.size, "Invalid chunk", "Invalid chunk.", [], "Negative data length specified"));
        finishtreebuild();
        return;
    }
    if (length + 12 + curChunkStart > global_theFile.size) {
        global_nodetree.children.push(new FileNode(curChunkStart, chunkHeader.size, "Invalid chunk", "Invalid chunk.", [], "Specified data length exceeds file size"));
        finishtreebuild();
        return;
    }
    if (chunkname == "IHDR") {
        chunkn = new FileNode(curChunkStart, 12 + length, chunkname + " Chunk", "The IHDR Chunk is a fixed-size information chunk that should be the first chunk in every PNG file.", []);
    } else if (chunkname == "IDAT") {
        chunkn = new FileNode(curChunkStart, 12 + length, chunkname + " Chunk", "An IDAT chunk contains the actual image data. There may be more than one IDAT chunk.", []);
    } else if (chunkname == "tEXt") {
        chunkn = new FileNode(curChunkStart, 12 + length, chunkname + " Chunk", "A tEXt chunk contains a keyword and textual information", []);
    } else if (chunkname == "IEND") {
        chunkn = new FileNode(curChunkStart, 12 + length, chunkname + " Chunk", "The IEND Chunk is a chunk with no data, that should be the last chunk in every PNG file.", []);
    } else {
        chunkn = new FileNode(curChunkStart, 12 + length, chunkname + " Chunk", chunkname + " Chunk", []);
    }
    chunkn.children.push(new FileNode(curChunkStart, 4, "Chunk Length", "A 4-byte big-endian integer representing the length of the data field for this chunk.<br/>VALUE: " + length, []));
    chunkn.children.push(new FileNode(curChunkStart + 4, 4, "Chunk Name", "Alphabetical-only 4-byte string representing the name of this chunk.<br/>VALUE: " + chunkname, []));
    if (length > 0) {
        datanode = new FileNode(curChunkStart + 8, length, "Chunk Data", "Chunk Data", []);
        chunkn.children.push(datanode);
        if (chunkname == "tEXt") {
            textChunks.push(datanode);
        }
    }
    chunkn.children.push(new FileNode(curChunkStart + 8 + length, 4, "Chunk CRC", "4-byte Cyclic Redundancy Code calculated on the chunk type field and chunk data fields.", []));    
    global_nodetree.children.push(chunkn);
    curChunkStart = curChunkStart + 12 + length;
    if (global_theFile.size > curChunkStart) {
        //read another chunk
        readNextChunk();
    } else {
        readNextTextChunk();
    }
}

/******************************
 * Read a tEXt chunk          *
 ******************************/
function readNextTextChunk() {
    if (textChunks.length == 0) {
        finishup();
        return;
    }
    if (textChunks[curtextchunk].length > 3000) {
        //don't read text chunks that are huge
        curtextchunk++;
        readNextTextChunk();
        return;
    }
    readFileSlice(textChunks[curtextchunk].start, textChunks[curtextchunk].start + textChunks[curtextchunk].length, global_theFile, processTextChunk);
}

/****************************
 * Process a tEXt chunk     *
 ****************************/
function processTextChunk(thebytes) {
    var keyword = readNullTerminatedString(thebytes);
    if ( (keyword.length+1) < thebytes.byteLength) {
        var stringvalue = readString(thebytes.slice(keyword.length+1,thebytes.byteLength));
        alert(stringvalue);
        //TODO - ADD ANOTHER NODE FOR THIS (SKIPPING NULL BYTE)
        //TODO - USE https://github.com/inexorabletash/text-encoding to replace 'readString' method and use Latin 1
        //TODO - throw error if no value field (no null terminated string)
        //TODO - throw error if keyword more than 79 bytes
        //TODO - do header node and iTXT nodes next
    }
    var keywordnode = new FileNode(textChunks[curtextchunk].start, keyword.length, "tEXt Keyword", "A keyword for this tEXt chunk.<br/>VALUE: " + keyword, []);
    textChunks[curtextchunk].children.push(keywordnode);
    curtextchunk++;
    if (curtextchunk >= textChunks.length) {
        //done
        finishup();
    } else {
        readNextTextChunk();
    }
    
}

/*********************************************************
 * Do some final checks of the PNG file before finishing *
 *********************************************************/
function finishup() {
    if (global_nodetree.children[1].name != "IHDR Chunk") {
        global_nodetree.error = "This PNG file does not start with the expected IHDR Chunk";
    }
    if (global_nodetree.children[global_nodetree.children.length-1].name != "IEND Chunk") {
        global_nodetree.error = "This PNG file does not end with the expected IEND Chunk";
    }
    //finished
    finishtreebuild();
}