#include "sha1.h"
#include <EEPROM.h>

#define SHORT_MSG_LEN  11  // the smallest of the below lengths
#define TIME_MSG_LEN   11  // time sync to PC is HEADER followed by Unix time_t as ten ASCII digits
#define SEED_MSG_LEN   17  // Seed HEADER followed by 16 charicter seed
#define EMAIL_MSG_LEN  41  // Email HEADER followed by 40 charicter sha1 of email
#define TIME_HEADER  'T'   // Header tag for serial time sync message
#define SEED_HEADER  'S'   // Header tag for serial seed sync message


typedef unsigned long time_t;
uint8_t hmacKey1[10];

void setup() {
  for (int i=0; i < 10; ++i) {
    hmacKey1[i] = EEPROM.read(i);
  }
  Serial.begin(9600);
}

long truncatedHashWithTime(long time) {
   uint8_t byteArray[8];
   time = time / 30;
              
   byteArray[0] = 0x00;
   byteArray[1] = 0x00;
   byteArray[2] = 0x00;
   byteArray[3] = 0x00;
   byteArray[4] = (int)((time >> 24) & 0xFF) ;
   byteArray[5] = (int)((time >> 16) & 0xFF) ;
   byteArray[6] = (int)((time >> 8) & 0XFF);
   byteArray[7] = (int)((time & 0XFF));
  
   uint8_t* hash;
   uint32_t a; 
   Sha1.initHmac(hmacKey1,10);
   Sha1.writebytes(byteArray, 8);
   hash = Sha1.resultHmac();
  
   int  offset = hash[20 - 1] & 0xF; 
   long truncatedHash = 0;
   int j;
   for (j = 0; j < 4; ++j) {
    truncatedHash <<= 8;
    truncatedHash  |= hash[offset + j];
   }
    
   truncatedHash &= 0x7FFFFFFF;
   truncatedHash %= 1000000;
  
  return truncatedHash;
}

void requestHandler() {
  while(Serial.available() >=  SHORT_MSG_LEN ){
    char c = Serial.read() ; 
    if( c == TIME_HEADER ) {
      time_t pctime = 0;
      for(int i=0; i < TIME_MSG_LEN-1; i++){   
        c = Serial.read();          
        if( c >= '0' && c <= '9'){   
          pctime = (10 * pctime) + (c - '0') ; // convert digits to a number    
        }
      }
      char hashString[7];
      sprintf(hashString,"%06ld\n",truncatedHashWithTime(pctime));
      Serial.print(hashString);
    } else if ( c == SEED_HEADER ) {
      int result = 0;
      int buffer = 0;
      int bitsLeft = 0;
      for(int i=0; i < SEED_MSG_LEN-1; i++){    
        c = Serial.read();
        // Convert base32 string into number and store it
        if( c >= '2' && c <= '7'){   
          c = 26 + (c - '2'); 
        } else if ( c >= 'A' && c <= 'Z' ) {
          c = c - 'A';
        }
        buffer <<= 5;    
        buffer |= c;
        bitsLeft += 5;
        if (bitsLeft >= 8)
        {
          hmacKey1[result] = (uint8_t)((unsigned int)(buffer >> (bitsLeft - 8)) & 0xFF);
          EEPROM.write(i, hmacKey1[result]);
          result++;
          bitsLeft -= 8;
        }
      }
    }
  }
}

void loop() {
  
  if(Serial.available()) {
    
   requestHandler();
   
  }

  delay(1000);
    
}
