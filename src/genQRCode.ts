import makeWASocket, { useMultiFileAuthState, Browsers } from '@adiwajshing/baileys'

async function connectToWhatsApp() {

  const { state, saveCreds } = await useMultiFileAuthState("auth_info_baileys");
  const sock = makeWASocket({
    printQRInTerminal: true,
    auth: state,
	  browser: Browsers.macOS('Desktop'),
  });

  sock.ev.on("creds.update", saveCreds);
  sock.ev.on("connection.update", async (update) => {

    const { connection, lastDisconnect } = update;
    if (connection === "close") {

      const shouldReconnect = true
      console.log("connection closed due to ", lastDisconnect?.error, ", reconnecting ", shouldReconnect);

      if (shouldReconnect) {
        await connectToWhatsApp();
      }
    }

  });
}
connectToWhatsApp();
