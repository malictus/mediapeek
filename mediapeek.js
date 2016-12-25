/*********************************************
 * MediaPeek JavaScript                      *
 * Copyright 2016, James Halliday            *
 * MEDIAPEEK.JS                              *
 *********************************************/

/**************
TODOS
- make blue links not blue or underlined
- make clicking them work, and reset on curvalues but not read new bytes
- make arrow keys work
***************/

//the currently open file
var theFile;
//the current byteposition
var bytepos = -1;
//the actual ArrayBuffer of data
var theBytes;
//number of byte actually selected in binary display
var dispByte = 0;

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
    if (theFile != null) {
        if (theFile.size < 1) {
            bytepos = -1;
        } else {
            bytepos = 0;
        }
    }
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
    if (theFile != null) {
        if (theFile.size < 1) {
            bytepos = -1;
        } else {
            bytepos = 0;
        }
    }
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
    intval = bytepos - (COLLIMIT * ROWLIMIT);
    if (intval < 0) {
        intval = 0;
    }
    readFileFrom(intval);
}

/**********************************
 * btnForward button was pressed  * 
 **********************************/
function handleBtnForward() {
    intval = bytepos + (COLLIMIT * ROWLIMIT);
    if (intval >= theFile.size) {
        intval = theFile.size - 1;
    }
    readFileFrom(intval);
}

/************************************************* UPDATE UI CODE ***********************/
/*******************************************
 * New byte position button was pressed    *
 *******************************************/
function updateBytePos() {
    if (theFile == null) {
        return;
    }
    var newval = $('#bytepostext').val();
    var intval = parseInt(newval);
    if (readFileFrom(intval) == -1) {
        $('#bytepostext').val(bytepos);
    }
}

/****************************************************
 * A new file has been selected; update the display *
 ****************************************************/
function updateFileDisplay() {
    //reset current byte position to zero
    $('#bytepostext').val(0);
    loadBasicInfo();
    loadPlayer();
    updateBytePos();
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
    if (bytepos > 0) {
        $('#btnBack').removeAttr('disabled');
    } else {
        $('#btnBack').attr('disabled','disabled');
    }
    if (bytepos < (theFile.size - (COLLIMIT * ROWLIMIT))) {
        $('#btnForward').removeAttr('disabled');
    } else {
        $('#btnForward').attr('disabled','disabled');
    }
    //show current value of byte
    if (theBytes != null) {
        var view = new DataView(theBytes);
        if ($('#decorhex-controls').val() === "8u") {
            $('#currentbytevalue').html("Current value: &nbsp;&nbsp;" + view.getUint8(0) + "&nbsp;&nbsp;");
        } else if ($('#decorhex-controls').val() === "8s") {
            $('#currentbytevalue').html("Current value: &nbsp;&nbsp;" + view.getInt8(0) + "&nbsp;&nbsp;");
        } else if ( ($('#decorhex-controls').val() === "16ule") && (bytepos < (theFile.size - 1))) {
            $('#currentbytevalue').html("Current value: &nbsp;&nbsp;" + view.getUint16(0,true) + "&nbsp;&nbsp;");
        } else if ( ($('#decorhex-controls').val() === "16ube") && (bytepos < (theFile.size - 1))) {
            $('#currentbytevalue').html("Current value: &nbsp;&nbsp;" + view.getUint16(0,false) + "&nbsp;&nbsp;");
        } else if ( ($('#decorhex-controls').val() === "16sle") && (bytepos < (theFile.size - 1))) {
            $('#currentbytevalue').html("Current value: &nbsp;&nbsp;" + view.getInt16(0,true) + "&nbsp;&nbsp;");
        } else if ( ($('#decorhex-controls').val() === "16sbe") && (bytepos < (theFile.size - 1))) {
            $('#currentbytevalue').html("Current value: &nbsp;&nbsp;" + view.getInt16(0,false) + "&nbsp;&nbsp;");
        } else if ( ($('#decorhex-controls').val() === "32ule") && (bytepos < (theFile.size - 3))) {
            $('#currentbytevalue').html("Current value: &nbsp;&nbsp;" + view.getUint32(0,true) + "&nbsp;&nbsp;");
        } else if ( ($('#decorhex-controls').val() === "32ube") && (bytepos < (theFile.size - 3))) {
            $('#currentbytevalue').html("Current value: &nbsp;&nbsp;" + view.getUint32(0,false) + "&nbsp;&nbsp;");
        } else if ( ($('#decorhex-controls').val() === "32sle") && (bytepos < (theFile.size - 3))) {
            $('#currentbytevalue').html("Current value: &nbsp;&nbsp;" + view.getInt32(0,true) + "&nbsp;&nbsp;");
        } else if ( ($('#decorhex-controls').val() === "32sbe") && (bytepos < (theFile.size - 3))) {
            $('#currentbytevalue').html("Current value: &nbsp;&nbsp;" + view.getInt32(0,false) + "&nbsp;&nbsp;");  
        } else if ( ($('#decorhex-controls').val() === "32fbe") && (bytepos < (theFile.size - 3))) {
            $('#currentbytevalue').html("Current value: &nbsp;&nbsp;" + view.getFloat32(0,false) + "&nbsp;&nbsp;");  
        } else if ( ($('#decorhex-controls').val() === "32fle") && (bytepos < (theFile.size - 3))) {
            $('#currentbytevalue').html("Current value: &nbsp;&nbsp;" + view.getFloat32(0,true) + "&nbsp;&nbsp;");  
        } else if ( ($('#decorhex-controls').val() === "64fbe") && (bytepos < (theFile.size - 7))) {
            $('#currentbytevalue').html("Current value: &nbsp;&nbsp;" + view.getFloat64(0,false) + "&nbsp;&nbsp;");  
        } else if ( ($('#decorhex-controls').val() === "64fle") && (bytepos < (theFile.size - 7))) {
            $('#currentbytevalue').html("Current value: &nbsp;&nbsp;" + view.getFloat64(0,true) + "&nbsp;&nbsp;");  
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
            output = output + displayAddress((y * COLLIMIT) + bytepos) + "&nbsp;&nbsp;";
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
                    output = output + "<a href='s'>" + displaySingleByte(testbyte) + "</a> ";
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
                    output = output + "<a href='s'>" + displayByteAsCharCode(testbyte) + "</a>";
                }
                x = x + 1;
            }
            output = output + "<br/>";
            y = y + 1;
        }
        $('#binarydisplay').html(output);
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
 * Load a new slice of the file and populate UI accordingly *
 * returns -1 if new value isn't valid                      *
 ************************************************************/
function readFileFrom(intval) {
    if ((intval !== intval) || (intval < 0) || (intval > (theFile.size - 1))) {
        return -1;
    }
    bytepos = intval;
    var reader = new FileReader();
    reader.onloadend = function(evt) {
        if (evt.target.readyState == FileReader.DONE) {
            theBytes = evt.target.result;
            updateControls();
            updateBinaryDisplay();
        }
    };
    var end = bytepos + ARRAY_SIZE;
    if (end > theFile.size) {
        end = theFile.size;
    }
    var blob = theFile.slice(bytepos, end);
    reader.readAsArrayBuffer(blob);
}
