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
    //get file handler listener going
    $('#thefile').change(function(e) {
        handleFileSelect(e);
    });
});

/***************************************
 * handle file chooser selection event * 
 ***************************************/
function handleFileSelect(e) {
    //for now there will always be only one
    theFile = e.target.files[0];     
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
function updateFileDisplay() {
    var thetype = theFile.type;
    //hide the display panels (in case something was here before)
    var videoNode = document.getElementById('videodisplay');
    var pictureNode = document.getElementById('imagedisplay');
    videoNode.setAttribute("src", "");
    videoNode.style.visibility = "hidden";
    videoNode.setAttribute("controls", false);
    pictureNode.style.visibility = "hidden";
    //now display if possible
    if (thetype.startsWith("image/")) {
        //display an image
        //don't want to run the browser out of memory
        if (theFile.size < FILESIZE_MAX) {
            var reader = new FileReader();
            reader.onload = function(event) {
                the_url = event.target.result;
                pictureNode.innerHTML = "<img class='imgdisplay' src='" + the_url + "' />";
            }
            reader.readAsDataURL(theFile);
            pictureNode.style.visibility = "";
        }
    } else if (thetype.startsWith("video/") || thetype.startsWith("audio/")) {
        //display a video
        var canPlay = videoNode.canPlayType(thetype);
        if (canPlay != '') {
            var fileURL = URL.createObjectURL(theFile);
            videoNode.src = fileURL;
            videoNode.style.visibility = "";
            videoNode.setAttribute("controls", true);
        } 
    }
}

