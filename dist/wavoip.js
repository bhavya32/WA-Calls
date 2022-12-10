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
var wavoip = require('./wavoip.node');
const P = require('pino');
function startListeners(sock) {
    console.log("started listening");
    sock.ws.on(`CB:call`, (node) => {
        //console.dir(node, {depth:null, colors:true});
        (0, wavoip_handler_1.handle_call)(node);
    });
    sock.ws.on(`CB:ack,class:call`, (node) => {
        (0, wavoip_handler_1.handle_ack)(node);
    });
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
        setTimeout(startListeners, 15000, sock);
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
            }
        }));
    });
}
connectToWhatsApp();
