Research lib for calls. Will be hopefully merged in baileys when it gets fully functional.

Doesn't work with node. You need to use [electron-v12.0.0-beta.31](https://github.com/electron/electron/releases/tag/v12.0.0-beta.31) (addon uses node module version 87)


Note: I have manually disabled the baileys inbuilt event handler for call as it was sending acks for all events. Just remove `ws.on("CB:call")` and `ev.on("call")` event listner.

### To Run
Main entry point is wavoip.js

```
[electron binary.exe] ./dist/wavoip.js
```

Generate auth creds using `node ./dist/genQRCode.js` coz electron doesn't print qr code correctly. 

Set baileys call event type to any in events.d.ts for using typescript.

Finally add createParticipantNodes to exports in the messages-send.js file of baileys. 

For selecting mic and audio output, you can list all the uid from audioSelector.ts and put them in wavoip_handler.ts

### Wavoip Overview

Caller is the call creator and callee is the target who receives call

1. Offer Generation
    Caller sends offer to 4 types of device - 0, 24, 26, 27. I don't know what determines this. The offer includes 4 - 32 byte keys for each type of device. This key is probably SRTP keys used to encrypt WebRTC client. 26 is probably discontinued and must be ignored to avoid errors.

2. Offer Ack
    Offer ack is received in 1 msg for all device types. It includes some 150 bytes tokens and a 24 byte key and te2 tag nodes. The te2 tag nodes are in pair, and 1st includes ip and port of probably whatsapp server for relaying and 2nd node has some 18 byte content. Maybe relaying server needs some authentication? Also a receipt node is exchanged as an ack for offer

3. Preaccept
    The callee then sends a preaccept with some details like audio and capability.

4. Relaylatencies
    Both sides ping some relay server(I think its called a STUN request) and exchange the latencies 5 times.
    Wavoip module automatically creates a relay to the client side.

5. Transport
    When traffic starts receiving, terminate is sent to other 3 device types. The caller sends his local and global ip in transport node along with port number.

6. Accept
    The callee sends accept node, which has his both IPs. Wavoip then removed the relay server and makes a p2p tunnel. 


### Notes - 
Audio.exe is just a bare minimum rust compiled binary to play mp3 and wav files and supports tts.
```
audio.exe [p1] [p2]
```
p1 can be `text` for text to speech(tts) or `audio` for playing audio file.
p2 can be any string in case of tts or path of the audio file when p1 is `audio`.