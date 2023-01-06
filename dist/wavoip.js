"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const baileys_1 = __importStar(require("@adiwajshing/baileys"));
const wavoip_handler_1 = require("./wavoip_handler");
const P = require('pino');
var player_process;
var spawn = require('child_process').spawn;
function startCallw() {
    var jid = "911234567890";
    (0, wavoip_handler_1.startCall)(jid);
}
function connectToWhatsApp() {
    return __awaiter(this, void 0, void 0, function* () {
        const { state, saveCreds } = yield (0, baileys_1.useMultiFileAuthState)("auth_info_baileys");
        const sock = (0, baileys_1.default)({
            printQRInTerminal: true,
            auth: state,
            browser: baileys_1.Browsers.macOS('Desktop'),
            logger: P({ level: 'error' }),
        });
        sock.ev.on("creds.update", saveCreds);
        sock.ev.on("call", (event) => __awaiter(this, void 0, void 0, function* () {
            if (event.event == "offer") {
                setTimeout(wavoip_handler_1.sendAcceptToWavoip, 2000);
            }
            else if (event.event == "connected") {
                player_process = spawn("./audio.exe", ["audio", "sound.mp3"]);
                if (!player_process) {
                    console.log("Error spawning audio.exe");
                }
                player_process.on('close', function (err) {
                    (0, wavoip_handler_1.endCall)();
                });
            }
            else if (event.event == "terminated") {
                if (player_process)
                    player_process.kill();
            }
        }));
        sock.ev.on("connection.update", (update) => __awaiter(this, void 0, void 0, function* () {
            const { connection, lastDisconnect } = update;
            if (connection === "close") {
                const shouldReconnect = true;
                console.log("connection closed due to ", lastDisconnect === null || lastDisconnect === void 0 ? void 0 : lastDisconnect.error, ", reconnecting ", shouldReconnect);
                if (shouldReconnect) {
                    yield connectToWhatsApp();
                }
            }
            if (connection === "open") {
                (0, wavoip_handler_1.initialize_wavoip)(sock, state);
                //setTimeout(startCallw, 2000)
            }
        }));
    });
}
connectToWhatsApp();
