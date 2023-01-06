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
exports.startCall = exports.handleAckfromSocket = exports.handle_call = exports.sendAcceptToWavoip = exports.initialize_wavoip = exports.endCall = void 0;
var wavoip = require('./wavoip.node');
const baileys_1 = require("@adiwajshing/baileys");
const helper_1 = require("./helper");
var baileys_sock;
var baileys_state;
function LoggingCallback() {
    //console.log(arguments)
}
function EventCallback(event_code, t, r) {
    if (event_code == 14) {
        var event = {
            event: "connected",
            from: r.peer_raw_jid,
            type: "audio"
        };
        baileys_sock.ev.emit("call", event);
    }
    else if (event_code == 46) {
        endCall();
    }
}
function endCall() {
    wavoip.end(true, "");
}
exports.endCall = endCall;
function XmppCallback(call_id, from, node) {
    //console.log("to send =>", arguments)
    switch (node[0]) {
        case "relaylatency":
        case "preaccept":
        case "accept":
        case "transport":
        //handleEventfromWavoip(call_id, from, node)
        //break
        case "terminate":
            handleEventfromWavoip(call_id, from, node);
            if (node[0] == "terminate" && node[2]) {
                var event = {
                    event: 'terminated',
                    from: from,
                    type: "audio"
                };
                baileys_sock.ev.emit("call", event);
            }
            break;
        case "offer":
            sendOffer(call_id, from, node);
            break;
    }
}
function handleEventfromWavoip(call_id, peer_jid, obj) {
    return __awaiter(this, void 0, void 0, function* () {
        var node = {
            tag: "call",
            attrs: {
                to: peer_jid,
                id: baileys_sock.generateMessageTag()
            }
        };
        node.content = [yield objectToBinaryNode(obj)];
        baileys_sock.sendNode(node);
    });
}
function sendOffer(call_id, peer_jid, obj) {
    return __awaiter(this, void 0, void 0, function* () {
        var node = yield objectToBinaryNode(obj);
        if (node.content instanceof Array) {
            node.content.push({
                tag: "device-identity",
                attrs: {},
                content: (0, baileys_1.encodeSignedDeviceIdentity)(baileys_state.creds.account, true)
            });
        }
        var fnode = {
            tag: "call",
            attrs: {
                id: baileys_sock.generateMessageTag(),
                to: peer_jid
            },
            content: [node]
        };
        baileys_sock.sendNode(fnode);
        //console.dir(fnode, {depth:null, colors:true})
    });
}
function handleEventfromSocket(node) {
    (0, helper_1.sendCustomAck)(node, baileys_sock);
    var wavoip_obj = {
        elapsed_msec: undefined,
        epoch_msec: node.attrs.t + "000",
        is_offline: undefined,
        payload: [],
        peer_app_version: undefined,
        peer_jid: "",
        peer_platform: undefined
    };
    if (node.content instanceof Array) {
        wavoip_obj.peer_jid = node.attrs.from,
            wavoip_obj.payload = BinaryNodetoObject(node.content[0]);
    }
    wavoip.handleIncomingSignalingMsg(wavoip_obj);
    console.dir(wavoip_obj, { depth: null, colors: true });
}
function sendReceipt(node) {
    const userJid = baileys_state.creds.me.id.split(":")[0] + "@s.whatsapp.net";
    var recepit_node = {
        tag: "receipt",
        attrs: {
            from: userJid,
            to: node.attrs.from,
            id: node.attrs.id,
        },
        content: [{
                tag: "offer",
                attrs: {
                    'call-id': node.content[0].attrs["call-id"],
                    'call-creator': node.content[0].attrs["call-creator"]
                },
            }]
    };
    baileys_sock.sendNode(recepit_node);
    var event = {
        event: "offer",
        from: node.attrs.from,
        type: "audio" //(node.content as any)[0].content[0].tag
    };
    if (node.content[0].content[8] && node.content[0].content[8].tag == "video") {
        event.type = "video";
    }
    baileys_sock.ev.emit("call", event);
}
function handleOffer(node) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log("Offer Received");
        sendReceipt(node);
        var call_info = {
            "call-creator": {
                _jid: {
                    server: "s.whatsapp.net",
                    type: 0,
                    user: node.attrs.from.split("@")[0]
                }
            },
            'call-id': node.content[0].attrs['call-id'],
            device_class: node.content[0].attrs.device_class,
            joinable: node.content[0].attrs.joinable
        };
        var voip_info = [];
        //todo - I dont know when pkmsg or msg is used. baileys get pkmsg but 
        //update - implemented decoding pkmsg and pkmsg
        for (var t of node.content[0].content) {
            if (t.content == undefined) {
                t.content = null;
            }
            else if (t.content instanceof Uint8Array) {
                if (t.tag == "enc") {
                    t.content = yield (0, helper_1.decodePkmsg)(node.attrs.from, t.content, baileys_state, t.attrs.type);
                }
                t.content = Array.from(t.content);
            }
            if (t.tag == "relay") {
                var relay_content = [];
                for (var x of (t.content)) {
                    if (x.content == undefined) {
                        x.content = null;
                    }
                    else if (x.content instanceof Uint8Array) {
                        x.content = Array.from(x.content);
                    }
                    if (x.tag == "participant") {
                        x.attrs.jid = { _jid: {
                                type: 0,
                                user: x.attrs.jid.split("@")[0],
                                server: "s.whatsapp.net"
                            } };
                    }
                    else if (x.tag == "token" && ("id" in x.attrs)) {
                        continue;
                    }
                    else if (x.tag == "te2" && ("token_id" in x.attrs)) {
                        continue;
                    }
                    var temp = [x.tag, x.attrs, x.content];
                    relay_content.push(temp);
                }
                t.content = relay_content;
            }
            var temp = [t.tag, t.attrs, t.content];
            voip_info.push(temp);
        }
        var payload = ["offer", call_info, voip_info];
        var offer = {
            elapsed_msec: node.attrs.e,
            epoch_msec: node.attrs.t + "000",
            is_offline: undefined,
            payload: payload,
            peer_app_version: node.attrs.version,
            peer_jid: node.attrs.from,
            peer_platform: node.attrs.platform,
        };
        //console.log(offer)
        //console.dir(offer, {depth:null, colors:true})
        wavoip.getNumParticipantsFromCallOffer(offer, function (x) {
            //console.log("getNumParticipantsFromCallOffer =>", x)
            wavoip.handleIncomingSignalingOffer(offer, true, 5);
            console.log("handled offer");
        });
    });
}
function initialize_wavoip(sock, state) {
    var _a;
    baileys_sock = sock;
    baileys_state = state;
    var jid = (_a = sock.user) === null || _a === void 0 ? void 0 : _a.id;
    wavoip.init(jid, true, true, true, false);
    //I just hardcoded my camera and audio devices :)
    //wavoip.getAVDevices(function (t: any){console.log("getavdevice", t)})
    wavoip.registerAVDeviceChangedCallback(function () { });
    wavoip.registerAVDeviceStatusChangedCallback(function (e, r, n, i) { });
    // You can use the above 3 functions or hardcode your audio device as well
    wavoip.registerEventCallback(EventCallback);
    wavoip.registerSignalingXmppCallback(XmppCallback);
    wavoip.registerLoggingCallback(LoggingCallback);
    var audio = {
        //"0": "\\\\?\\SWD#MMDEVAPI#{0.0.1.00000000}.{ae7328e3-d6a9-405b-8846-95ce9387699a}#{2eef81be-33fa-4800-9670-1cd474972c3f}",
        "0": "\\\\?\\SWD#MMDEVAPI#{0.0.1.00000000}.{ec86b6ff-de92-40eb-8e08-247fad34a210}#{2eef81be-33fa-4800-9670-1cd474972c3f}",
        // "1": "\\\\?\\SWD#MMDEVAPI#{0.0.0.00000000}.{6e226f1b-93af-4e2a-82d3-bde0029a787e}#{e6327cad-dcec-4949-ae8a-991e976a79d2}"
        "1": ""
    };
    //wavoip.selectCamera('\\\\?\\USB#VID_0BDA&PID_579C&MI_00#6&d4d66ce&0&0000#{e5323777-f976-4f5b-9b55-b94699c46e44}\\GLOBAL')
    //wavoip.selectAudio(audio['0'],audio['1'], function (){})
    //wavoip.setLogPath('C:\\Users\\New\\Desktop\\voip_crash_log.txt')
    wavoip.updateNetworkMedium(2, 0);
    wavoip.setScreenSize(1920, 1080);
    wavoip.updateAudioVideoSwitch(true);
    sock.ws.on(`CB:call`, (node) => {
        handle_call(node);
    });
    sock.ws.on(`CB:ack,class:call`, (node) => {
        handleAckfromSocket(node);
    });
    console.log("started");
}
exports.initialize_wavoip = initialize_wavoip;
function sendAcceptToWavoip() {
    wavoip.acceptCall(true, true);
}
exports.sendAcceptToWavoip = sendAcceptToWavoip;
function handle_call(node) {
    if (!(node.content && (typeof (node.content[0]) == 'object'))) {
        return;
    }
    switch (node.content[0].tag) {
        case "offer":
            handleOffer(node);
            break;
        case "relaylatency":
        case "transport":
        case "terminate":
        case "preaccept":
        case "accept":
            handleEventfromSocket(node);
            break;
        case "receipt":
            (0, helper_1.sendCustomAck)(node, baileys_sock);
            break;
    }
}
exports.handle_call = handle_call;
function handleAckfromSocket(node) {
    console.log("passing ack to wavoip");
    var ack_obj_n = {
        error: 0,
        peer_jid: node.attrs.from,
        type: node.attrs.type
    };
    ack_obj_n.ack = BinaryNodetoObject(node);
    wavoip.handleIncomingSignalingAck(ack_obj_n);
}
exports.handleAckfromSocket = handleAckfromSocket;
function startCall(jid) {
    return __awaiter(this, void 0, void 0, function* () {
        var call_id = (0, baileys_1.generateMessageID)() + (0, baileys_1.generateMessageID)();
        wavoip.startMD(jid + "@s.whatsapp.net", [jid + ".0:24@s.whatsapp.net", jid + ".0:26@s.whatsapp.net", jid + ".0:27@s.whatsapp.net", jid + ".0:0@s.whatsapp.net"], call_id, false);
    });
}
exports.startCall = startCall;
function format_attrs(attrs) {
    for (var key of Object.keys(attrs)) {
        if (key == "call-creator" || key == "jid") {
            attrs[key] = (0, baileys_1.jidEncode)(attrs[key].user, "s.whatsapp.net", attrs[key].device);
        }
        if (typeof (attrs[key]) != "string") {
            attrs[key] = attrs[key].toString();
        }
    }
    return attrs;
}
function objectToBinaryNode(obj) {
    return __awaiter(this, void 0, void 0, function* () {
        var node = {
            tag: obj[0],
            attrs: obj[1] ? format_attrs(obj[1]) : {}
        };
        if (obj[2]) {
            if (node.tag == "to") {
                //console.log(node)
                node.content = [yield (0, helper_1.encmsg)(new Uint8Array(obj[2][0][2]), [node.attrs.jid], baileys_sock)];
            }
            else if (obj[2][0] instanceof Array) {
                node.content = [];
                if (obj[2][0][0] == "to") {
                    console.dir(obj[2], { depth: null, colors: true });
                }
                for (var con of obj[2]) {
                    if (con[0] == "to" && con[1].jid.device == 26)
                        continue;
                    node.content.push(yield objectToBinaryNode(con));
                }
            }
            else {
                node.content = new Uint8Array(obj[2]);
            }
        }
        return node;
    });
}
function format_attrs_rev(attrs) {
    for (var key of Object.keys(attrs)) {
        if ((0, baileys_1.isJidUser)(attrs[key])) {
            attrs[key] = (0, helper_1.jidStringToObj)(attrs[key]);
        }
    }
    return attrs;
}
function BinaryNodetoObject(node) {
    var result = [node.tag, format_attrs_rev(node.attrs), node.content];
    if (node.content == undefined) {
        result[2] = null;
    }
    else if (node.content instanceof Uint8Array) {
        result[2] = Array.from(node.content);
    }
    else if (typeof node.content == 'object') {
        result[2] = [];
        for (var xnode of node.content) {
            result[2].push(BinaryNodetoObject(xnode));
        }
    }
    return result;
}
