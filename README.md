NeatOTP
=======

An OTP generator built for a leostick. It comes with chrome extensions that
detect the two factor page and automatically requests a token from the arduino.

This was hacked togeather and may not work anymore, I'm open sourcing it at the
request of some co-workers who are interested in poking around.

## Arduino

This part is the most likely to work, since hardware doesn't change as much.

Once you have flashed the software onto the leostick open a serial connection
with it.

### Setting the Seed

To set the seed send a message to the leostick in the form of:
`SXXXXXXXXXXXXXXXX` where `X` is your 16 digit seed and `S` is the serial header

### Getting a token

To get a token just send the 10 digit unix time with the serial header 'T'

## Chrome

### Extension

### PackagedApp