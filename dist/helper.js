"use strict";
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
exports.sendCustomAck = exports.jidStringToObj = exports.encmsg = exports.decodePkmsg = void 0;
const baileys_1 = require("@adiwajshing/baileys");
function decodePkmsg(from, array, baileys_state, e2etype) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        var msgBuffer = yield (0, baileys_1.decryptSignalProto)(from, e2etype, array, baileys_state);
        if (!(msgBuffer instanceof Buffer)) {
            console.log("Error decrypting");
        }
        let msg = baileys_1.proto.Message.decode((0, baileys_1.unpadRandomMax16)(msgBuffer));
        return ((_a = msg.call) === null || _a === void 0 ? void 0 : _a.callKey) || new Uint8Array;
    });
}
exports.decodePkmsg = decodePkmsg;
function encmsg(buffer, jids, baileys_sock) {
    return __awaiter(this, void 0, void 0, function* () {
        var msg = {
            call: {
                callKey: buffer
            },
            messageContextInfo: {}
        };
        console.log(jids);
        yield baileys_sock.assertSessions(jids, false);
        const patched = yield baileys_sock.createParticipantNodes(jids, msg);
        return patched.nodes[0].content[0];
    });
}
exports.encmsg = encmsg;
function jidStringToObj(jid) {
    var return_obj = { _jid: {} };
    var jid_obj = (0, baileys_1.jidDecode)(jid);
    if (jid_obj) {
        return_obj._jid = {
            user: jid_obj.user,
            type: jid_obj.device ? 1 : 0
        };
        if (jid_obj.device) {
            return_obj._jid.device = jid_obj.device;
            return_obj._jid.domainType = 0;
        }
        else {
            return_obj._jid.server = "s.whatsapp.net";
        }
    }
    return return_obj;
}
exports.jidStringToObj = jidStringToObj;
function sendCustomAck(node, sock) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        var stanza = {
            tag: 'ack',
            attrs: {
                id: node.attrs.id,
                to: node.attrs.from,
                class: node.tag,
            }
        };
        if (node.tag == 'call' && (node.content instanceof Array)) {
            stanza.attrs.type = node.content[0].tag;
        }
        //send from attr if receipt
        if (node.tag == "receipt") {
            var jid = (0, baileys_1.jidDecode)((_a = sock.user) === null || _a === void 0 ? void 0 : _a.id);
            stanza.attrs.from = (jid === null || jid === void 0 ? void 0 : jid.user) + "@s.whatsapp.net";
        }
        yield sock.sendNode(stanza);
    });
}
exports.sendCustomAck = sendCustomAck;
