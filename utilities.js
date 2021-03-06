/*********************************************
 * MediaPeek                                 *
 * Copyright 2017, James Halliday            *
 * UTILITIES.JS                              *
 *********************************************/

/**********************************
 * Convert bytes to readable text *
 **********************************/
//See http://stackoverflow.com/questions/15900485/correct-way-to-convert-size-in-bytes-to-kb-mb-gb-in-javascript
function formatBytes(bytes,decimals) {
   if(bytes == 0) return '0 Bytes';
   var k = 1024;
   var dm = decimals + 1 || 3;
   var sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
   var i = Math.floor(Math.log(bytes) / Math.log(k));
   return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/*******************************************************
 * Display a single byte as a two-character hex string *
 *******************************************************/
function displaySingleByte(byte) {
    var ret = byte.toString(16);
    if (ret.length < 2) {
        ret = "0" + ret;
    }
    return ret;
}

/****************************************************
 * Display a single byte as a char code if possible *
 ****************************************************/
function displayByteAsCharCode(byte) {
    if ((byte >= 33) && (byte <= 122)) {
        return escapeHtml(String.fromCharCode(byte));
    } else {
        return ".";
    }
}

/**************************
 * Display a byte address *
 **************************/
function displayAddress(bytepos) {
    var ret = bytepos.toString(16);
    while (ret.length < 8) {
        ret = "0" + ret;
    }
    return ret;
}

/******************************
 * Escape bad HTML characters *
 ******************************/
//see http://stackoverflow.com/questions/6234773/can-i-escape-html-special-chars-in-javascript
function escapeHtml(unsafe) {
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
 }

/******************************************************************
 * Read a chunk of a file and return bytes in a callback function *
 ******************************************************************/
function readFileSlice(startByte, endByte, theFile, callbackfunction) {
    blob = theFile.slice(startByte, endByte);
    var reader = new FileReader();
    reader.onloadend = function(evt) {
        if (evt.target.readyState == FileReader.DONE) {
            callbackfunction(evt.target.result);
        }              
    };
    reader.readAsArrayBuffer(blob);
}

/*******************************************************
 * Parse a byte array into alphabetical only text      *
 * Return null if any non alphabetic chars are present *
 *******************************************************/
function readAlphaChunk(bytearray) {
    var view = new DataView(bytearray);
    if (bytearray.byteLength < 1) {
        return null;
    }
    var x = 0;
    var finalstring = "";
    while (x < bytearray.byteLength) {
        var b = view.getUint8(x);
        if ( (b < 65) || (b > 122) || ( (b > 90) && (b < 97) ) ) {
            return null;
        }
        finalstring = finalstring + String.fromCharCode(b);
        x++;
    }
    return finalstring;
}

/********************************************************************
 * Parse a byte array into a null terminated string                 *
 * Will continue until the end of the array or first null character *
 ********************************************************************/
function readNullTerminatedString(bytearray) {
    var view = new DataView(bytearray);
    if (bytearray.byteLength < 1) {
        return null;
    }
    var x = 0;
    var finalstring = "";
    while (x < bytearray.byteLength) {
        var b = view.getUint8(x);
        if (b == 0) {
            return finalstring;
        }
        finalstring = finalstring + String.fromCharCode(b);
        x++;
    }
    return finalstring;
}

/***************************************************************
 * Parse a byte array into a simple string                     *
 ***************************************************************/
function readString(bytearray) {
    var view = new DataView(bytearray);
    if (bytearray.byteLength < 1) {
        return null;
    }
    var x = 0;
    var finalstring = "";
    while (x < bytearray.byteLength) {
        var b = view.getUint8(x);
        finalstring = finalstring + String.fromCharCode(b);
        x++;
    }
    return finalstring;
}

