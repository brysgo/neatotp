function getQueryVariable(name){
   if(name=(new RegExp('[?&]'+encodeURIComponent(name)+'=([^&]*)')).exec(window.location.search))
      return decodeURIComponent(name[1]);
}

var emailField = document.getElementById("Email")
if (emailField != null) {
  emailField.addEventListener("blur", function() {
    var email = emailField.value;
    var userAndHost = email.split('@');
    if (userAndHost[1] === 'gmail.com') email = userAndHost[0];
    localStorage.setItem('email', email);
  }, false);
}

var otpField = document.getElementById("smsUserPin");
if (otpField != null && !getQueryVariable('smsUserPin')) {
  // document.getElementById("smsUserPin").value = '123456'
  var frame = document.createElement('iframe');
  frame.src = 'http://localhost:8083?url='+encodeURIComponent(window.location.href);
  frame.style.display = 'none';
  document.getElementsByTagName('body')[0].appendChild(frame);
}
