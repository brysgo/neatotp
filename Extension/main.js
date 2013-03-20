var otpField = document.getElementById("smsUserPin");
var emailField = document.getElementById("Email")
if (emailField != null) {
  emailField.addEventListener("blur", function() {
    var email = emailField.value;
    var userAndHost = email.split('@');
    if (userAndHost[1] === 'gmail.com') email = userAndHost[0];
    localStorage.setItem('email', email);
  }, false);
}
if (otpField != null) {
  document.getElementById("smsUserPin").value = '123456'
}
