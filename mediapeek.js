/*********************************************
 * MediaPeek JavaScript                      *
 * Copyright 2016, James Halliday            *
 * MEDIAPEEK.JS                              *
 *********************************************/

/**********************************************************
 * A FileNode is the main component of a file             *
 * start = byte address of start of this node             *
 * length = length of node in bytes                       *
 * description = a string description of a node           *
 * children = an array of child FileNodes, might be empty *
 * error = error messages associated with node (optional) *
 **********************************************************/
function FileNode(start, length, description, children, error) {    
    this.start = start;
    this.length = length;
    this.description = description;
    this.children = children;
    this.error = error;
}

//the currently open file
var theFile;
//the current byteposition - will be -1 if file is zero-byte or no file open
var bytepos = -1;
//the actual ArrayBuffer of file data
var theBytes;
//number of byte actually selected in binary display
var dispByte = 0;
//number of the byte at the beginning of binary display
var beginByte = 0;
//an integer that represents the file type of the currently open file
var filetype = FILETYPE_NONE;
//a FileNode object we will build later
var nodetree;

//the maximum size (in bytes) for displaying images
var FILESIZE_MAX = 4000000;
//size of array for reading values for display and computing current value
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
    //initiate tree
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
    theFile = e.target.files[0];  
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
    theFile = e.dataTransfer.files[0];
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
    intval = beginByte - (COLLIMIT * ROWLIMIT);
    if (intval < 0) {
        intval = 0;
    }
    readFileFrom(intval, false);
}

/**********************************
 * btnForward button was pressed  * 
 **********************************/
function handleBtnForward() {
    intval = beginByte + (COLLIMIT * ROWLIMIT);
    if (intval >= theFile.size) {
        intval = theFile.size - 1;
    }
    readFileFrom(intval, false);
}

/************************************************* UPDATE UI CODE ***********************/
/******************************************************************************
 * Update to a new byte position (reloading byte array and binary display)    *
 ******************************************************************************/
function updateBytePos() {
    if (theFile == null) {
        return;
    }
    var newval = $('#bytepostext').val();
    var intval = parseInt(newval);
    if (readFileFrom(intval, true) == -1) {
        $('#bytepostext').val(bytepos);
    } else {
        dispByte = 0;
        
    }
}

/***********************************************************
 * Triggered once the actual file type has been determined *
 ***********************************************************/
function triggerTreeBuild(newFileType) {
    filetype = newFileType;
    switch(filetype) {
        case FILETYPE_PNG:
            buildPNGNodeTree(theFile, finishTreeBuild);
            break;
        default:
            break;
    }
}

/*************************************************
 * Nodetree has been built, not populate tree UI *
 *************************************************/
function finishTreeBuild(newnodetree) {
    nodetree = newnodetree;
}

/*************************************************
 * New byte within binary display was pressed    *
 *************************************************/
function slideTo(newpos) {
    if (theFile == null) {
        return;
    }
    if ((newpos >= 0) && (newpos <= (ROWLIMIT * COLLIMIT))) {
        dispByte = newpos;
        bytepos = beginByte + dispByte;
        updateControls();
        updateBinaryDisplay();
    }
}

/****************************************************
 * A new file has been selected; update the display *
 ****************************************************/
function updateFileDisplay() {
    if (theFile != null) {
        if (theFile.size < 1) {
            bytepos = -1;
            $('#binarydisplay').html("");
        } else {
            bytepos = 0;
        }
    }
    //reset current byte position to zero
    $('#bytepostext').val(0);
    dispByte = 0;
    beginByte = 0;
    loadBasicInfo();
    loadPlayer();
    updateBytePos();
    buildFileTree();
}  

/***********************
 * Build the file tree *
 ***********************/
function buildFileTree() {
    findFileType(theFile);
}

/***************************************************
 * Update the controls portion of binary display   *
 ***************************************************/
function updateControls() {
    if (bytepos == -1) {
        //zero byte file; nothing to do here
        $('#byteposdisplay').html("Current address: N/A &nbsp;&nbsp;&nbsp;&nbsp;");
    } else {
        //display current byte position
        if ($('#hexcheck').is(':checked')) {
            $('#byteposdisplay').html("Current address: 0x" + bytepos.toString(16));
        } else {
            $('#byteposdisplay').html("Current address: " + bytepos);
        }
    }
    //disable or enable byte position button
    if (theFile.size < 2) {
        $('#byteposbutton').attr('disabled','disabled');
    } else {
        $('#byteposbutton').removeAttr('disabled');
    }
    //disable or enable the arrow buttons
    if (beginByte > 0) {
        $('#btnBack').removeAttr('disabled');
    } else {
        $('#btnBack').attr('disabled','disabled');
    }
    if (beginByte < (theFile.size - (COLLIMIT * ROWLIMIT))) {
        $('#btnForward').removeAttr('disabled');
    } else {
        $('#btnForward').attr('disabled','disabled');
    }
    //show current value of byte
    if (theBytes != null) {
        var view = new DataView(theBytes);
        if ($('#decorhex-controls').val() === "8u") {
            $('#currentbytevalue').html("Current value: &nbsp;&nbsp;" + view.getUint8(dispByte) + "&nbsp;&nbsp;");
        } else if ($('#decorhex-controls').val() === "8s") {
            $('#currentbytevalue').html("Current value: &nbsp;&nbsp;" + view.getInt8(dispByte) + "&nbsp;&nbsp;");
        } else if ( ($('#decorhex-controls').val() === "16ule") && (bytepos < (theFile.size - 1))) {
            $('#currentbytevalue').html("Current value: &nbsp;&nbsp;" + view.getUint16(dispByte,true) + "&nbsp;&nbsp;");
        } else if ( ($('#decorhex-controls').val() === "16ube") && (bytepos < (theFile.size - 1))) {
            $('#currentbytevalue').html("Current value: &nbsp;&nbsp;" + view.getUint16(dispByte,false) + "&nbsp;&nbsp;");
        } else if ( ($('#decorhex-controls').val() === "16sle") && (bytepos < (theFile.size - 1))) {
            $('#currentbytevalue').html("Current value: &nbsp;&nbsp;" + view.getInt16(dispByte,true) + "&nbsp;&nbsp;");
        } else if ( ($('#decorhex-controls').val() === "16sbe") && (bytepos < (theFile.size - 1))) {
            $('#currentbytevalue').html("Current value: &nbsp;&nbsp;" + view.getInt16(dispByte,false) + "&nbsp;&nbsp;");
        } else if ( ($('#decorhex-controls').val() === "32ule") && (bytepos < (theFile.size - 3))) {
            $('#currentbytevalue').html("Current value: &nbsp;&nbsp;" + view.getUint32(dispByte,true) + "&nbsp;&nbsp;");
        } else if ( ($('#decorhex-controls').val() === "32ube") && (bytepos < (theFile.size - 3))) {
            $('#currentbytevalue').html("Current value: &nbsp;&nbsp;" + view.getUint32(dispByte,false) + "&nbsp;&nbsp;");
        } else if ( ($('#decorhex-controls').val() === "32sle") && (bytepos < (theFile.size - 3))) {
            $('#currentbytevalue').html("Current value: &nbsp;&nbsp;" + view.getInt32(dispByte,true) + "&nbsp;&nbsp;");
        } else if ( ($('#decorhex-controls').val() === "32sbe") && (bytepos < (theFile.size - 3))) {
            $('#currentbytevalue').html("Current value: &nbsp;&nbsp;" + view.getInt32(dispByte,false) + "&nbsp;&nbsp;");  
        } else if ( ($('#decorhex-controls').val() === "32fbe") && (bytepos < (theFile.size - 3))) {
            $('#currentbytevalue').html("Current value: &nbsp;&nbsp;" + view.getFloat32(dispByte,false) + "&nbsp;&nbsp;");  
        } else if ( ($('#decorhex-controls').val() === "32fle") && (bytepos < (theFile.size - 3))) {
            $('#currentbytevalue').html("Current value: &nbsp;&nbsp;" + view.getFloat32(dispByte,true) + "&nbsp;&nbsp;");  
        } else if ( ($('#decorhex-controls').val() === "64fbe") && (bytepos < (theFile.size - 7))) {
            $('#currentbytevalue').html("Current value: &nbsp;&nbsp;" + view.getFloat64(dispByte,false) + "&nbsp;&nbsp;");  
        } else if ( ($('#decorhex-controls').val() === "64fle") && (bytepos < (theFile.size - 7))) {
            $('#currentbytevalue').html("Current value: &nbsp;&nbsp;" + view.getFloat64(dispByte,true) + "&nbsp;&nbsp;");  
        } else {
            $('#currentbytevalue').html("Current value: &nbsp;&nbsp; N/A &nbsp;&nbsp;");
        }
    }
}

/*************************************************************
 * Loads the binary display                                  *
 * Assumes 'theBytes' array is loaded and ready for reading  *
 *************************************************************/
function updateBinaryDisplay() {
    if (theBytes != null) {
        var view = new DataView(theBytes);
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
                if (x + (y * COLLIMIT) == dispByte) {
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
                if (x + (y * COLLIMIT) == dispByte) {
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

/*******************************************
 * Load basic file information text        *
 * called when loading a new file          *
 * assumes 'theFile' is set before calling *
 *******************************************/
function loadBasicInfo() {
    $('#filename').html(theFile.name);
    $('#filesize').html(theFile.size + " bytes (" + formatBytes(theFile.size,1) + ")");
    var thetype = theFile.type;
    if (thetype === "") {
        thetype = "NONE";
    }
    $('#filetype').html(thetype);
}

/*******************************************
 * Display picture/video/sound player      *
 * called when loading a new file
 * assumes 'theFile' is set before calling *
 *******************************************/
function loadPlayer() {
    var thetype = theFile.type;
    var displayNode = document.getElementById('filedisplay');
    //now display if possible
    if (thetype.startsWith("image/")) {
        //display an image
        //don't want to run the browser out of memory
        if (theFile.size < FILESIZE_MAX) {
            var reader = new FileReader();
            reader.onload = function(event) {
                the_url = event.target.result;
                displayNode.innerHTML = "<img class='imgdisplay' src='" + the_url + "' />";
            }
            reader.readAsDataURL(theFile);
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
            var fileURL = URL.createObjectURL(theFile);
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

/************************************************* FILE READING CODE ***********************/4
/************************************************************
 * Load a new slice of the file                             *
 * returns -1 if new value isn't valid                      *
 * if resetToZero is set, will move current pointer to top  *
 ************************************************************/
function readFileFrom(intval, resetToZero) {
    if ((intval !== intval) || (intval < 0) || (intval > (theFile.size - 1))) {
        return -1;
    }
    beginByte = intval;
    if (resetToZero == true) {
        bytepos = beginByte + dispByte;
    } else {
        dispByte = 0;
        bytepos = beginByte;
    }
    if (bytepos > theFile.size -1) {
        //does current byte go beyond end of file
        bytepos = intval;
        dispByte = 0;
    }
    var end = beginByte + ARRAY_SIZE;
    if (end > theFile.size) {
        end = theFile.size;
    }
    readFileSlice(beginByte, end, theFile, afterReadUpdate);
}

/*******************************************************
 * Handle the actual UI update after reading new bytes *
 *******************************************************/
function afterReadUpdate(returnbytes) {
    theBytes = returnbytes;
    updateControls();
    updateBinaryDisplay();
}
