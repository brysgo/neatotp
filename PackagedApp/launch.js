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

SerialConnection.prototype.findAndConnect = function(callback) {
  if (this.connectionId > -1) callback();
  var _this = this;
  var done = false;
  serial.getPorts(function(portList) {
    iter = function(i) {
      if (i == portList.length) return callback(-1);
      var port = portList[i];
      if (port.search('Bluetooth') != -1) return iter(i+1);
      console.log(port);
      try {
        _this.connect(port, function() {
          _this.write(_this.ping, function(writeInfo) {
            _this.readLine(function(ack) {
              if (!_this.ack(ack)) {
                return serial.close(_this.connectionId,function(){
                  return iter(i+1);
                });
              } else {
                callback(port);
              }
            });
          });
        });
      } catch (e) {
        if (_this.connectionId != -1) {
          return serial.close(_this.connectionId,function(){
            return iter(i+1);
          });
        }
      }
    };
    return iter(0);
  });
};

SerialConnection.prototype.read = function(callback) {
  // Only works for open serial ports.
  if (this.connectionId < 0) {
    callback(-1);
  }
  serial.read(this.connectionId, 1, this.onRead.bind(this));
  this.callbacks.read = callback;
};
SerialConnection.prototype.readLine = function(callback) {
  // Only works for open serial ports.
  if (this.connectionId < 0) {
    callback(-1);
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
    callback(-1);
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
var VENDOR_ID = 5824;
var PRODUCT_ID = 1503;
chrome.permissions.request(
  {permissions: [
      {'usbDevices': [{'vendorId': VENDOR_ID, "productId": PRODUCT_ID}] }
   ]},
function(result) {
  if (result) {
    requestButton.style.display = 'none';
    console.log('App was granted the "usbDevices" permission.');
    chrome.usb.findDevices(
        {"vendorId": VENDOR_ID, "productId": PRODUCT_ID},
       callback)
  } else {
    console.log('App was NOT granted the "usbDevices" permission.');
  }
});

////////////////////////////////////////////////////////

var seed = "S" + "AAAAAAAAAAAAAAAA";

var ser = new SerialConnection();
ser.ping = 'T0000000000'
ser.ack = function(response) {
  if (response && response.length == 6)
    return true;
  else
    return false;
}

function getQueryVariable(url,name){
  if(name=(new RegExp('[?&]'+encodeURIComponent(name)+'=([^&]*)')).exec(url))
    return decodeURIComponent(name[1]);
}

var socket = chrome.socket;
var socketInfo;

var onAccept = function(acceptInfo) {
  console.log("ACCEPT", acceptInfo)
  var socketId = acceptInfo.socketId;
  var serveMessage = function(msg) {
    var outputBuffer = stringToArrayBuffer("HTTPS/1.0 200 OK\nContent-length: " + msg.length + "\nContent-type: text/html\n\n"+msg);
    socket.write(socketId, outputBuffer, function(writeInfo) {
      console.log("WRITE", writeInfo);
      socket.destroy(socketId);
      socket.accept(socketInfo.socketId, onAccept);
    });
  };
  socket.read(socketId, function(readInfo) {
    console.log("READ", readInfo);
    // Parse the request.
    try {
    var data = arrayBufferToString(readInfo.data);
    } catch (e) {
      serveMessage("There was an error with your request.");
      return;
    }
    if(data.indexOf("GET ") == 0) {

      // we can only deal with GET requests
      var uriEnd =  data.indexOf(" ", 4);
      if(uriEnd < 0) { /* throw a wobbler */ return; }
      var uri = data.substring(4, uriEnd);

      var origURL = getQueryVariable(uri,'url');
      if (!getQueryVariable(origURL,'smsUserPin')) {
          ser.findAndConnect( function(port) {
              ser.write('T'+parseInt((new Date()).getTime()/1000), function(writeInfo) {
                  if (writeInfo == -1) {
                    serveMessage("Problem writing to device.");
                    return;
                  }
                  ser.readLine(function(otp) {
                    if (otp == -1) {
                      serveMessage("Problem reading from device.");
                      return;
                    }
                    var msg = "<html><head><script>top.location='"+origURL+"&smsUserPin="+otp+"';</script></head><body></body></html>";
                    serveMessage(msg);
                  });
              });
          });
      }
    }
  });
};

var reconnect = function() {
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
};

reconnect();
chrome.alarms.onAlarm.addListener( function(alarm) {  });
chrome.alarms.create("Guard", { periodInMinutes: 1.00 });

