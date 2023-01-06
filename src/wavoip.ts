import makeWASocket, { BufferJSON, useMultiFileAuthState, DisconnectReason, BinaryNode, Browsers } from '@adiwajshing/baileys'
import { call_event } from './types'
import {endCall, initialize_wavoip, sendAcceptToWavoip, startCall} from './wavoip_handler'
const P = require('pino')
var player_process: any
var spawn = require('child_process').spawn

function startCallw() {
  var jid: string = "911234567890"
  startCall(jid)
}

async function connectToWhatsApp() {

  const { state, saveCreds } = await useMultiFileAuthState("auth_info_baileys");

  const sock = makeWASocket({
    printQRInTerminal: true,
    auth: state,
	  browser: Browsers.macOS('Desktop'),
	  logger: P({ level: 'error' }),
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("call", async (event: call_event) => {
    if (event.event == "offer"){
      setTimeout(sendAcceptToWavoip, 2000)
    }
    else if (event.event == "connected"){
      player_process = spawn("./audio.exe", ["audio", "sound.mp3"])
      if (!player_process) {
        console.log("Error spawning audio.exe")
      }
      player_process.on('close',function(err:any){ 
        endCall()
      })
    }
    else if (event.event == "terminated") {
      if (player_process) player_process.kill()
    }
  })

  sock.ev.on("connection.update", async (update) => {

    const { connection, lastDisconnect } = update;
    if (connection === "close") {

      const shouldReconnect = true
      console.log("connection closed due to ", lastDisconnect?.error, ", reconnecting ", shouldReconnect);

      if (shouldReconnect) {
        await connectToWhatsApp();
      }
    }

    if (connection === "open") {
      initialize_wavoip(sock, state)
      //setTimeout(startCallw, 2000)
    }

  });
}
connectToWhatsApp();
