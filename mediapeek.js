/*********************************************
 * MediaPeek JavaScript                      *
 * Copyright 2016, James Halliday            *
 * MEDIAPEEK.JS                              *
 *********************************************/

//the currently open file
var theFile;
//the current byteposition
var bytepos = -1;

//the maximum size (in bytes) for displaying images
var FILESIZE_MAX = 4000000;
//size of array for reading values for display and computing current value
var ARRAY_SIZE = 512;
//the actual ArrayBuffer of data
var theBytes;

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
    //file browse button
    $('#shownbrowsebutton').click(function() {
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

/************************************************* FILE READING CODE ***********************/
/****************************************************
 * Update byte position in currently open file      *
 ****************************************************/
function updateBytePos() {
    if (theFile == null) {
        return;
    }
    var newval = $('#bytepostext').val();
    var intval = parseInt(newval);
    if ((intval !== intval) || (intval < 0) || (intval > (theFile.size - 1))) {
        $('#bytepostext').val(bytepos);
        return;
    }
    bytepos = intval;
    var reader = new FileReader();
    reader.onloadend = function(evt) {
        if (evt.target.readyState == FileReader.DONE) {
            theBytes = evt.target.result;
            updateControls();
        }
    };
    var end = bytepos + ARRAY_SIZE;
    if (end > theFile.size) {
        end = theFile.size;
    }
    var blob = theFile.slice(bytepos, end);
    reader.readAsArrayBuffer(blob);
}

/************************************************* UPDATE UI CODE ***********************/
/****************************************************
 * A new file has been selected; update the display *
 ****************************************************/
function updateFileDisplay() {
    //reset current byte position to zero
    $('#bytepostext').val(0);
    updateBasicInfo();
    updatePlayer();
    updateBytePos();
}  

/**************************************
 * Update the control area            *
 **************************************/
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

/**************************************
 * Update basic file information text *
 **************************************/
function updateBasicInfo() {
    $('#filename').html(theFile.name);
    $('#filesize').html(theFile.size + " bytes (" + formatBytes(theFile.size,1) + ")");
    var thetype = theFile.type;
    if (thetype === "") {
        thetype = "NONE";
    }
    $('#filetype').html(thetype);
}

/**************************************
 * Display picture/video/sound player *
 **************************************/
function updatePlayer() {
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

