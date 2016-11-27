/*********************************************
 * MediaPeek JavaScript                      *
 * Copyright 2016, James Halliday            *
 * MEDIAPEEK.JS                              *
 *********************************************/

//the currently open file
var theFile;

//the maximum size (in bytes) for displaying images
var FILESIZE_MAX = 4000000;

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
});

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

/****************************************************
 * A new file has been selected; update the display *
 ****************************************************/
function updateFileDisplay() {
    updateBasicInfo();
    updatePlayer();
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

