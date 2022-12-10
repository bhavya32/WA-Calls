import makeWASocket, { BufferJSON, useMultiFileAuthState, DisconnectReason, BinaryNode, Browsers } from '@adiwajshing/baileys'
import {handle_ack, handle_call, initialize_wavoip} from './wavoip_handler'
var wavoip = require('./wavoip.node')
const P = require('pino')

function startListeners(sock: any) {
  console.log("started listening")
  
  sock.ws.on(`CB:call`, (node: BinaryNode) => {
	  //console.dir(node, {depth:null, colors:true});
    handle_call(node)
  })

  sock.ws.on(`CB:ack,class:call`, (node: BinaryNode) => {
    handle_ack(node)
  })
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

  setTimeout(startListeners, 15000, sock)
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
    }

  });
}
connectToWhatsApp();
