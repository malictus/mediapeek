/*********************************************
 * MediaPeek                                 *
 * Copyright 2017, James Halliday            *
 * MEDIAPEEK.JS                              *
 *********************************************/

//TODOS
//make node red when there's an error
//when node clicked select correct part of binary display
//make selected node bytes green(?) in binary display when selecting node
//select innermost node of byte 0 at beginning
//move node appropriately when navigating through file in other ways

/**********************************************************
 * A FileNode is the main component of a file             *
 * start = byte address of start of this node             *
 * length = length of node in bytes                       *
 * name = a short name for the node                       *
 * description = a longer string description of a node    *
 * children = an array of child FileNodes, might be empty *
 * error = error message associated with node (optional)  *
 **********************************************************/
function FileNode(start, length, name, description, children, error) {    
    this.start = start;
    this.length = length;
    this.name = name;
    this.description = description;
    this.children = children;
    this.error = error;
}

//the currently open file
var global_theFile;
//the current byteposition --- will be -1 if file is zero-byte or no file open
var global_bytepos = -1;
//the current ArrayBuffer of file data
var global_theBytes;
//an integer that represents the file type of the currently open file
var global_filetype = FILETYPE_NONE;
//byte address of the byte at the beginning of binary display within the entire file
var global_beginByte = 0;
//the number of byte currently selected in binary display within the byte array only
var global_dispByte = 0;
//a FileNode object (with FileNode children) that represents the file
var global_nodetree;
//this is used to iterate ids when building trees
var global_tree_iterator = 0;
//used to compile all the tree nodes while generating tree
var global_tree_nodes = [];

//the maximum size (in bytes) for displaying images in the browser
var FILESIZE_MAX = 4000000;
//size of array for reading values for display and computing current value - must be > (COLLIMIT * ROWLIMIT)
var ARRAY_SIZE = 512;
//number of columns and rows in byte display
var COLLIMIT = 16;
var ROWLIMIT = 16;

/*****************
 * DOM is ready  *
 *****************/
$(function() {
    //see if js file API supported
    if (window.File && window.FileReader && window.FileList && window.Blob) {
        //success
    } else {
        alert('Javascript File API not implemented in this browser. This page may not work properly.');
    }
    //handle file choose button
    $('#thefile').change(function(e) {
        handleFileChooserSelect(e);
    });
    //handle dragging file to drop area
    var dropZone = document.getElementById('filedroparea');
    dropZone.addEventListener('dragover', handleDragOver, false);
    dropZone.addEventListener('drop', handleFileDrag, false);
    //initiate tree (doesn't actually do much yet)
    $('#tree').jstree();
    //init address shift button
    $('#byteposbutton').click(function() {
        handleBytePosButton();
    });
    //back and forward binary display buttons
    $('#btnBack').click(function() {
        handleBtnBack();
    });
    $('#btnForward').click(function() {
        handleBtnForward();
    });
    //file browse button
    $('#orclicktobrowse').click(function() {
        $('#thefile').click();
    });
    //hex checkbox for byte address
    $('#hexcheck').change(function() {
        updateControls();
    });
    //current value toggle
    $('#decorhex-controls').change(function() {
        updateControls();
    });
});

/************************************************** EVENT HANDLING ***********************/

/***************************************
 * handle file chooser selection event * 
 ***************************************/
function handleFileChooserSelect(e) {
    //for now there will always be only one
    global_theFile = e.target.files[0];  
    updateFileDisplay();
}

/*****************************************
 * handle dragging a file over drop area * 
 *****************************************/
function handleDragOver(e) {
    e.stopPropagation();
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
}

/*****************************************
 * handle dropping a file in drop area   * 
 *****************************************/
function handleFileDrag(e) {
    e.stopPropagation();
    e.preventDefault();
    //assumes one
    global_theFile = e.dataTransfer.files[0];
    updateFileDisplay();
}

/*****************************************
 * New byte position button was pressed  * 
 *****************************************/
function handleBytePosButton() {
    updateBytePos();
}

/*******************************
 * btnBack button was pressed  * 
 *******************************/
function handleBtnBack() {
    var intval = global_beginByte - (COLLIMIT * ROWLIMIT);
    if (intval < 0) {
        intval = 0;
    }
    readFileFrom(intval, false);
}

/**********************************
 * btnForward button was pressed  * 
 **********************************/
function handleBtnForward() {
    var intval = global_beginByte + (COLLIMIT * ROWLIMIT);
    if (intval >= global_theFile.size) {
        intval = global_theFile.size - 1;
    }
    readFileFrom(intval, false);
}

/*********************************
 * handle clicking a tree node   *
 *********************************/
function handleTreeNodeClick(e, data) {
    //assumes always selecting single node
    moreinfo = data.instance.get_node(data.selected[0]).data.description;
    if (data.instance.get_node(data.selected[0]).data.error) {
        moreinfo = moreinfo + "<br/><br/><div style='color: red'>ERROR: " + data.instance.get_node(data.selected[0]).data.error + "</div>";
    }
    $('#moreinfo').html(moreinfo);    
} 

/************************************************* UPDATE UI CODE ***********************/
/******************************************************************************
 * Update to a new byte position (reloading byte array and binary display)    *
 ******************************************************************************/
function updateBytePos() {
    if (global_theFile == null) {
        return;
    }
    var newval = $('#bytepostext').val();
    var intval = parseInt(newval);
    if (readFileFrom(intval, true) == -1) {
        $('#bytepostext').val(global_bytepos);
    } else {
        global_dispByte = 0;
    }
}

/***********************************************************
 * Triggered once the actual file type has been determined *
 ***********************************************************/
function triggerTreeBuild(newFileType) {
    global_filetype = newFileType;
    $('#tree').html("");
    $('#moreinfo').html("");
    switch(global_filetype) {
        case FILETYPE_PNG:
            buildPNGNodeTree(finishTreeBuild);
            break;
        case FILETYPE_NONE:
            break;
        default:
            break;
    }
}

/******************************************************
 * the Node tree has been built, now populate tree UI *
 ******************************************************/
function finishTreeBuild() {
    //build the UI based on the tree
    global_tree_iterator = 0;
    global_tree_nodes = [];
    global_tree_nodes.push({ "id" : global_tree_iterator, "parent" : "#", "text" : global_nodetree.name + " (" + formatBytes(global_nodetree.length,1) + ")", 
                           "data" : { "start" : global_nodetree.start, "length" : global_nodetree.length, "error" : global_nodetree.error, 
                           "description" : global_nodetree.description} });
    treeRecurse(global_nodetree, global_tree_iterator);
    global_tree_iterator++;   
    $('#tree').jstree('destroy');
    //have to add this event handler every time since we destroy previous
    $('#tree').on('changed.jstree', function (e, data) {
        handleTreeNodeClick(e, data);
    });
    //recreate tree
    $('#tree').jstree({ 'core' : {
        'data' : global_tree_nodes
    } });
}

/******************************************
 * recursive function to build tree nodes *
 ******************************************/
function treeRecurse(recursenode, parentID) {
    var x = 0;
    while (x < recursenode.children.length) {
        global_tree_iterator++;
        global_tree_nodes.push({ "id" : global_tree_iterator, "parent" : parentID, "text" : recursenode.children[x].name + " (" + formatBytes(recursenode.children[x].length,1) + ")",
                            "data" : { "start" : recursenode.children[x].start, "length" : recursenode.children[x].length, "error" : recursenode.children[x].error, 
                           "description" : recursenode.children[x].description} });
        if (recursenode.children[x].children.length > 0) {
            treeRecurse(recursenode.children[x], global_tree_iterator);
        }
        x = x + 1;
    }
}

/*************************************************
 * New byte within binary display was pressed    *
 *************************************************/
function slideTo(newpos) {
    if (global_theFile == null) {
        return;
    }
    if ((newpos >= 0) && (newpos <= (ROWLIMIT * COLLIMIT))) {
        global_dispByte = newpos;
        global_bytepos = global_beginByte + global_dispByte;
        updateControls();
        updateBinaryDisplay();
    }
}

/****************************************************
 * A new file has been selected; update the display *
 ****************************************************/
function updateFileDisplay() {
    if (global_theFile != null) {
        if (global_theFile.size < 1) {
            global_bytepos = -1;
            $('#binarydisplay').html("");
        } else {
            global_bytepos = 0;
        }
    }
    //reset current byte position to zero
    $('#bytepostext').val(0);
    global_dispByte = 0;
    global_beginByte = 0;
    loadBasicInfo();
    loadPlayer();
    updateBytePos();
    findFileType();
}  

/***************************************************
 * Update the controls portion of binary display   *
 ***************************************************/
function updateControls() {
    if (global_bytepos == -1) {
        //zero byte file; nothing to do here
        $('#byteposdisplay').html("Current address: N/A &nbsp;&nbsp;&nbsp;&nbsp;");
    } else {
        //display current byte position
        if ($('#hexcheck').is(':checked')) {
            $('#byteposdisplay').html("Current address: 0x" + global_bytepos.toString(16));
        } else {
            $('#byteposdisplay').html("Current address: " + global_bytepos);
        }
    }
    //disable or enable byte position button
    if (global_theFile.size < 2) {
        $('#byteposbutton').attr('disabled','disabled');
    } else {
        $('#byteposbutton').removeAttr('disabled');
    }
    //disable or enable the arrow buttons
    if (global_beginByte > 0) {
        $('#btnBack').removeAttr('disabled');
    } else {
        $('#btnBack').attr('disabled','disabled');
    }
    if (global_beginByte < (global_theFile.size - (COLLIMIT * ROWLIMIT))) {
        $('#btnForward').removeAttr('disabled');
    } else {
        $('#btnForward').attr('disabled','disabled');
    }
    //show current value of byte
    if (global_theBytes != null) {
        var view = new DataView(global_theBytes);
        if ($('#decorhex-controls').val() === "8u") {
            $('#currentbytevalue').html("Current value: &nbsp;&nbsp;" + view.getUint8(global_dispByte) + "&nbsp;&nbsp;");
        } else if ($('#decorhex-controls').val() === "8s") {
            $('#currentbytevalue').html("Current value: &nbsp;&nbsp;" + view.getInt8(global_dispByte) + "&nbsp;&nbsp;");
        } else if ( ($('#decorhex-controls').val() === "16ule") && (global_bytepos < (global_theFile.size - 1))) {
            $('#currentbytevalue').html("Current value: &nbsp;&nbsp;" + view.getUint16(global_dispByte,true) + "&nbsp;&nbsp;");
        } else if ( ($('#decorhex-controls').val() === "16ube") && (global_bytepos < (global_theFile.size - 1))) {
            $('#currentbytevalue').html("Current value: &nbsp;&nbsp;" + view.getUint16(global_dispByte,false) + "&nbsp;&nbsp;");
        } else if ( ($('#decorhex-controls').val() === "16sle") && (global_bytepos < (global_theFile.size - 1))) {
            $('#currentbytevalue').html("Current value: &nbsp;&nbsp;" + view.getInt16(global_dispByte,true) + "&nbsp;&nbsp;");
        } else if ( ($('#decorhex-controls').val() === "16sbe") && (global_bytepos < (global_theFile.size - 1))) {
            $('#currentbytevalue').html("Current value: &nbsp;&nbsp;" + view.getInt16(global_dispByte,false) + "&nbsp;&nbsp;");
        } else if ( ($('#decorhex-controls').val() === "32ule") && (global_bytepos < (global_theFile.size - 3))) {
            $('#currentbytevalue').html("Current value: &nbsp;&nbsp;" + view.getUint32(global_dispByte,true) + "&nbsp;&nbsp;");
        } else if ( ($('#decorhex-controls').val() === "32ube") && (global_bytepos < (global_theFile.size - 3))) {
            $('#currentbytevalue').html("Current value: &nbsp;&nbsp;" + view.getUint32(global_dispByte,false) + "&nbsp;&nbsp;");
        } else if ( ($('#decorhex-controls').val() === "32sle") && (global_bytepos < (global_theFile.size - 3))) {
            $('#currentbytevalue').html("Current value: &nbsp;&nbsp;" + view.getInt32(global_dispByte,true) + "&nbsp;&nbsp;");
        } else if ( ($('#decorhex-controls').val() === "32sbe") && (global_bytepos < (global_theFile.size - 3))) {
            $('#currentbytevalue').html("Current value: &nbsp;&nbsp;" + view.getInt32(global_dispByte,false) + "&nbsp;&nbsp;");  
        } else if ( ($('#decorhex-controls').val() === "32fbe") && (global_bytepos < (global_theFile.size - 3))) {
            $('#currentbytevalue').html("Current value: &nbsp;&nbsp;" + view.getFloat32(global_dispByte,false) + "&nbsp;&nbsp;");  
        } else if ( ($('#decorhex-controls').val() === "32fle") && (global_bytepos < (global_theFile.size - 3))) {
            $('#currentbytevalue').html("Current value: &nbsp;&nbsp;" + view.getFloat32(global_dispByte,true) + "&nbsp;&nbsp;");  
        } else if ( ($('#decorhex-controls').val() === "64fbe") && (global_bytepos < (global_theFile.size - 7))) {
            $('#currentbytevalue').html("Current value: &nbsp;&nbsp;" + view.getFloat64(global_dispByte,false) + "&nbsp;&nbsp;");  
        } else if ( ($('#decorhex-controls').val() === "64fle") && (global_bytepos < (global_theFile.size - 7))) {
            $('#currentbytevalue').html("Current value: &nbsp;&nbsp;" + view.getFloat64(global_dispByte,true) + "&nbsp;&nbsp;");  
        } else {
            $('#currentbytevalue').html("Current value: &nbsp;&nbsp; N/A &nbsp;&nbsp;");
        }
    }
}

/********************************************************************
 * Loads the binary display                                         *
 * Assumes 'global_theBytes' array is loaded and ready for reading  *
 ********************************************************************/
function updateBinaryDisplay() {
    if (global_theBytes != null) {
        var view = new DataView(global_theBytes);
        var x = 0;
        var y = 0;
        var output = "";
        var testbyte = "";
        var end = false;
        while ((y < ROWLIMIT) && (!end)) {
            x = 0;
            output = output + displayAddress((y * COLLIMIT)) + "&nbsp;&nbsp;";
            while ((x < COLLIMIT) && (!end)) {
                try {
                    testbyte = view.getUint8(x + (y * COLLIMIT));
                } catch(err) {
                    end = true;
                    while (x < COLLIMIT) {
                        //pad display for end of file
                        output = output + "&nbsp;&nbsp;&nbsp;";
                        x = x + 1;
                    }
                    continue;
                }
                if (x + (y * COLLIMIT) == global_dispByte) {
                    output = output + "<span class='selectedbyte'>" + displaySingleByte(testbyte) + "</span> ";
                } else {
                    output = output + "<a style='color: black; text-decoration: none;' onclick='slideTo(" + (x + (y * COLLIMIT)) + "); return false' href='#'>" + displaySingleByte(testbyte) + "</a> ";
                }
                x = x + 1;
            }
            x = 0;
            end = false;
            output = output + "&nbsp;&nbsp;";
            while ((x < COLLIMIT) && (!end)) {
                try {
                    testbyte = view.getUint8(x + (y * COLLIMIT));
                } catch(err) {
                    end = true;
                    while (x < COLLIMIT) {
                        //pad display for end of file
                        output = output + "&nbsp;";
                        x = x + 1;
                    }
                    continue;
                }
                if (x + (y * COLLIMIT) == global_dispByte) {
                    output = output + "<span class='selectedbyte'>" + displayByteAsCharCode(testbyte) + "</span>";
                } else {
                    output = output + "<a style='color: black; text-decoration: none;' onclick='slideTo(" + (x + (y * COLLIMIT)) + "); return false' href='#'>" + displayByteAsCharCode(testbyte) + "</a>";
                }
                x = x + 1;
            }
            output = output + "<br/>";
            y = y + 1;
        }
        $('#binarydisplay').html(output);
    } else {
        $('#binarydisplay').html("");
    }
}

/**************************************************
 * Load basic file information text               *
 * called when loading a new file                 *
 * assumes 'global_theFile' is set before calling *
 **************************************************/
function loadBasicInfo() {
    $('#filename').html(global_theFile.name);
    $('#filesize').html(global_theFile.size + " bytes (" + formatBytes(global_theFile.size,1) + ")");
    var thetype = global_theFile.type;
    if (thetype === "") {
        thetype = "NONE";
    }
    $('#filetype').html(thetype);
}

/**************************************************
 * Display picture/video/sound player             *
 * called when loading a new file                 *
 * assumes 'global_theFile' is set before calling *
 **************************************************/
function loadPlayer() {
    var thetype = global_theFile.type;
    var displayNode = document.getElementById('filedisplay');
    //now display if possible
    if (thetype.startsWith("image/")) {
        //display an image
        //don't want to run the browser out of memory
        if (global_theFile.size < FILESIZE_MAX) {
            var reader = new FileReader();
            reader.onload = function(event) {
                the_url = event.target.result;
                displayNode.innerHTML = "<img class='imgdisplay' src='" + the_url + "' />";
            }
            reader.readAsDataURL(global_theFile);
        }
    } else if (thetype.startsWith("video/") || thetype.startsWith("audio/")) {
        //display a video
        displayNode.innerHTML = "<video id='videodisplay'></video>";
        var videoNode = document.getElementById('videodisplay');
        videoNode.setAttribute("src", "");
        videoNode.style.visibility = "hidden";
        videoNode.setAttribute("controls", false);
        var canPlay = videoNode.canPlayType(thetype);
        if (canPlay != '') {
            var fileURL = URL.createObjectURL(global_theFile);
            videoNode.src = fileURL;
            videoNode.style.visibility = "";
            videoNode.setAttribute("controls", true);
        } else {
             displayNode.innerHTML = "FILE CANNOT BE DISPLAYED";
        }
    } else {
        displayNode.innerHTML = "FILE CANNOT BE DISPLAYED";
    }
}

/************************************************************
 * Load a new slice of the file                             *
 * returns -1 if new value isn't valid                      *
 * if resetToZero is set, will move current pointer to top  *
 ************************************************************/
function readFileFrom(intval, resetToZero) {
    if ((intval !== intval) || (intval < 0) || (intval > (global_theFile.size - 1))) {
        return -1;
    }
    global_beginByte = intval;
    if (resetToZero == true) {
        global_bytepos = global_beginByte + global_dispByte;
    } else {
        global_dispByte = 0;
        global_bytepos = global_beginByte;
    }
    if (global_bytepos > global_theFile.size -1) {
        //does current byte go beyond end of file
        global_bytepos = intval;
        global_dispByte = 0;
    }
    var end = global_beginByte + ARRAY_SIZE;
    if (end > global_theFile.size) {
        end = global_theFile.size;
    }
    readFileSlice(global_beginByte, end, global_theFile, afterReadUpdate);
}

/*******************************************************
 * Handle the actual UI update after reading new bytes *
 *******************************************************/
function afterReadUpdate(returnbytes) {
    global_theBytes = returnbytes;
    updateControls();
    updateBinaryDisplay();
}
