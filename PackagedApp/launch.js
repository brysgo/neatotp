const device = '/dev/tty.usbmodemfd131';
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
    var char = this._arrayBufferToString(readInfo.data);
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
  var array = this._stringToArrayBuffer(msg);
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
  log('wrote:' + writeInfo.bytesWritten);
  if (this.callbacks.write) {
    this.callbacks.write(writeInfo);
  }
};

/** From tcp-client */
SerialConnection.prototype._arrayBufferToString = function(buf) {
  return String.fromCharCode.apply(null, new Uint8Array(buf));
}

SerialConnection.prototype._stringToArrayBuffer = function(str) {
  var buf = new ArrayBuffer(str.length*2); // 2 bytes for each char
  var bufView = new Uint16Array(buf);
  for (var i=0, strLen=str.length; i<strLen; i++) {
    bufView[i] = str.charCodeAt(i);
  }
  return buf;
}


////////////////////////////////////////////////////////
////////////////////////////////////////////////////////
////////////////////////////////////////////////////////
////////////////////////////////////////////////////////

var ser = new SerialConnection();
ser.connect(device, function() {
  log('connected to: ' + device);
  ser.write('T'+parseInt((new Date()).getTime()/1000), function() {
  });
  readNextLine();
});

function readNextLine() {
  ser.readLine(function(line) {
    log('readline: ' + line);
    readNextLine();
  });
}

function log(msg) {
  console.log(msg);
}
