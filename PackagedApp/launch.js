const device = '/dev/tty.usbmodemfd121';
const serial = chrome.serial;
const timeout = 100;

function SerialConnection() {
  this.connectionId = -1;
  this.callbacks = {};
}

SerialConnection.prototype.connect = function(device, callback) {
  serial.open(device, this.onOpen.bind(this))
  this.callbacks.connect = callback;
};

SerialConnection.prototype.read = function(callback) {
  // Only works for open serial ports.
  if (this.connectionId < 0) {
    throw 'Invalid connection';
  }
  serial.read(this.connectionId, 1, this.onRead.bind(this));
  this.callbacks.read = callback;
};
SerialConnection.prototype.readLine = function(callback) {
  // Only works for open serial ports.
  if (this.connectionId < 0) {
    throw 'Invalid connection';
  }
  var line = '';

  // Keep reading bytes until we've found a newline.
  var readLineHelper = function(readInfo) {
    var char = arrayBufferToString(readInfo.data);
    if (char == '') {
      // Nothing in the buffer. Try reading again after a small timeout.
      setTimeout(function() {
        this.read(readLineHelper);
      }.bind(this), timeout);
      return;
    }
    if (char == '\n') {
      // End of line.
      callback(line);
      line = '';
    }
    line += char;
    this.read(readLineHelper)
  }.bind(this)

  this.read(readLineHelper);
};

SerialConnection.prototype.write = function(msg, callback) {
  // Only works for open serial ports.
  if (this.connectionId < 0) {
    throw 'Invalid connection';
  }
  this.callbacks.write = callback;
  var array = stringToArrayBuffer(msg);
  serial.write(this.connectionId, array, this.onWrite.bind(this));
};

SerialConnection.prototype.onOpen = function(connectionInfo) {
  this.connectionId = connectionInfo.connectionId;
  if (this.callbacks.connect) {
    this.callbacks.connect();
  }
};

SerialConnection.prototype.onRead = function(readInfo) {
  if (this.callbacks.read) {
    this.callbacks.read(readInfo);
  }
};

SerialConnection.prototype.onWrite = function(writeInfo) {
  console.log('wrote:' + writeInfo.bytesWritten);
  if (this.callbacks.write) {
    this.callbacks.write(writeInfo);
  }
};

/** From tcp-client */
arrayBufferToString = function(buf) {
  return String.fromCharCode.apply(null, new Uint8Array(buf));
}

stringToArrayBuffer = function(str) {
  var buf = new ArrayBuffer(str.length);
  var bufView = new Uint8Array(buf);
  for (var i=0, strLen=str.length; i<strLen; i++) {
    bufView[i] = str.charCodeAt(i);
  }
  return buf;
}




////////////////////////////////////////////////////////
////////////////////////////////////////////////////////
////////////////////////////////////////////////////////
////////////////////////////////////////////////////////

var seed = "S" + "AAAAAAAAAAAAAAAA";

var ser = new SerialConnection();

function go() {
  ser.connect(device, function() {
    console.log('connected to: ' + device);

    console.log('seed: ', seed);
    ser.write('S' + seed, function(writeInfo) { });

    ser.write('T'+parseInt((new Date()).getTime()/1000), function(writeInfo) {
    });
    readNextLine();
  });
}

function readNextLine() {
  ser.readLine(function(line) {
    console.log('readline: ' + line);
  });

  // setTimeout(readNextLine, 1000);
}

go();

var socket = chrome.socket;
var socketInfo;

var onAccept = function(acceptInfo) {
  console.log("ACCEPT", acceptInfo)
  var socketId = acceptInfo.socketId;
  socket.read(socketId, function(readInfo) {
    console.log("READ", readInfo);
    // Parse the request.
    var data = arrayBufferToString(readInfo.data);
    if(data.indexOf("GET ") == 0) {

      // we can only deal with GET requests
      var uriEnd =  data.indexOf(" ", 4);
      if(uriEnd < 0) { /* throw a wobbler */ return; }
      var uri = data.substring(4, uriEnd);
      // strip query string
      var q = uri.indexOf("?");
      if (q != -1) {
        uri = uri.substring(0, q);
      }
      var msg = "window.location=window.location+'&smsUserPin=999999';"
      var outputBuffer = stringToArrayBuffer("HTTPS/1.0 200 OK\nContent-length: " + msg.length + "\nContent-type: application/javascript\n\n"+msg);
      socket.write(socketId, outputBuffer, function(writeInfo) {
        console.log("WRITE", writeInfo);
        socket.destroy(socketId);
        socket.accept(socketInfo.socketId, onAccept);
      });
    }
    else {
      // Throw an error
      socket.destroy(socketId);
    }
  });
};

chrome.storage.local.get('last_socket', function(result) {
  var socketId = result['last_socket'];
  if (typeof(socketId)==="number") socket.destroy(socketId);
  socket.create("tcp", {}, function(_socketInfo) {
    socketInfo = _socketInfo;
    chrome.storage.local.set({'last_socket': socketInfo.socketId}, function() {});
    socket.listen(socketInfo.socketId, '127.0.0.1', 8083, 50, function(result) {
      console.log("LISTENING:", result);
      socket.accept(socketInfo.socketId, onAccept);
    });
  });
});


