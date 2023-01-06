var wavoip = require('./wavoip.node')

import { AuthenticationState, BinaryNode, decryptSignalProto, encodeSignedDeviceIdentity, FullJid, generateMessageID, isJidUser, jidDecode, jidEncode } from '@adiwajshing/baileys'
import { attrs_format, decodePkmsg, encmsg, jidStringToObj, sendCustomAck } from './helper'
import { call_event } from './types'

var baileys_sock: any
var baileys_state: AuthenticationState

function LoggingCallback() {
    //console.log(arguments)
}

function EventCallback(event_code: number, t: any, r: any) {
    if (event_code == 14) {
        var event : call_event = {
            event: "connected",
            from: r.peer_raw_jid,
            type: "audio"
        }
        baileys_sock.ev.emit("call", event)
    }
    else if (event_code == 46) {
        endCall()
    }
}

export function endCall() {
    wavoip.end(true, "")
}


function XmppCallback(call_id: any, from : any, node : any) {
    //console.log("to send =>", arguments)
    switch(node[0]) {
        case "relaylatency": 
        case "preaccept":
        case "accept":
        case "transport":
            //handleEventfromWavoip(call_id, from, node)
            //break
        case "terminate":
            handleEventfromWavoip(call_id, from, node)
            if (node[0] == "terminate" && node[2]) {
                var event : call_event = {
                    event: 'terminated',
                    from: from,
                    type: "audio"
                }
                baileys_sock.ev.emit("call", event)
            }
            break
        case "offer":
            sendOffer(call_id, from, node)
            break
    }
}

async function handleEventfromWavoip(call_id: string, peer_jid: string, obj: any) {
    var node : BinaryNode = {
        tag: "call",
        attrs: {
            to: peer_jid,
            id: baileys_sock.generateMessageTag()
        }
    }
    node.content = [await objectToBinaryNode(obj)]
    baileys_sock.sendNode(node)
}

async function sendOffer(call_id: string, peer_jid: string, obj: any) {
    var node: BinaryNode = await objectToBinaryNode(obj)
    if (node.content instanceof Array) {
        node.content.push({
            tag:"device-identity",
            attrs: {},
            content: encodeSignedDeviceIdentity(baileys_state.creds.account!, true)
        })
    }
    var fnode : BinaryNode = {
        tag: "call", 
        attrs: {
            id: baileys_sock.generateMessageTag(),
            to: peer_jid
        },
        content:[node]
    }
    baileys_sock.sendNode(fnode)
    //console.dir(fnode, {depth:null, colors:true})
}

function handleEventfromSocket(node: BinaryNode) {
    sendCustomAck(node, baileys_sock)

    var wavoip_obj: any = {
        elapsed_msec: undefined,
        epoch_msec: node.attrs.t + "000",
        is_offline: undefined,
        payload: [],
        peer_app_version: undefined,
        peer_jid: "",
        peer_platform: undefined
    }
    if (node.content instanceof Array) {
        wavoip_obj.peer_jid = node.attrs.from,
        wavoip_obj.payload = BinaryNodetoObject(node.content[0])
    }
    wavoip.handleIncomingSignalingMsg(wavoip_obj)
    console.dir(wavoip_obj, {depth: null, colors: true})
}

function sendReceipt(node: BinaryNode) {
    const userJid = baileys_state.creds.me!.id.split(":")[0] + "@s.whatsapp.net"
    var recepit_node : BinaryNode = {
        tag: "receipt",
        attrs: {
            from: userJid,
            to: node.attrs.from,
            id: node.attrs.id,
        },
        content: [{
            tag : "offer",
            attrs:{
                'call-id': (node.content as any)[0].attrs["call-id"],
                'call-creator': (node.content as any)[0].attrs["call-creator"]
            },
        }]
    }
    baileys_sock.sendNode(recepit_node)

    var event : call_event = {
        event: "offer",
        from: node.attrs.from,
        type: "audio"//(node.content as any)[0].content[0].tag
    }

    if ((node.content as any)[0].content[8] && (node.content as any)[0].content[8].tag == "video") {
        event.type = "video"
    }
    baileys_sock.ev.emit("call", event)
}


async function handleOffer(node:BinaryNode) {
    console.log("Offer Received")
    sendReceipt(node)
    var call_info = {
        "call-creator": {
        _jid : {
            server: "s.whatsapp.net",
            type:0,
            user: node.attrs.from.split("@")[0]
        }},
        'call-id': (node.content as any)[0].attrs['call-id'],
        device_class: (node.content as any)[0].attrs.device_class,
        joinable: (node.content as any)[0].attrs.joinable
    }

    var voip_info : any[] = []

    //todo - I dont know when pkmsg or msg is used. baileys get pkmsg but 
    //update - implemented decoding pkmsg and pkmsg
    for (var t of (node.content as any)[0].content) {
        if (t.content == undefined)
        {
            t.content = null
        }
        else if (t.content instanceof Uint8Array) {
            if (t.tag == "enc") {
                t.content = await decodePkmsg(node.attrs.from, t.content as Uint8Array, baileys_state, t.attrs.type)
            }
            t.content = Array.from(t.content)
        }
        if (t.tag == "relay")
        {
            var relay_content :any[] = []
            for (var x of (t.content)) {
                if (x.content == undefined)
                {
                    x.content = null
                }
                else if (x.content instanceof Uint8Array) {
                    x.content = Array.from(x.content)
                }

                if (x.tag == "participant") {
                    x.attrs.jid = {_jid:{
                        type: 0,
                        user: x.attrs.jid.split("@")[0],
                        server: "s.whatsapp.net"
                    }}
                }else if (x.tag == "token" && ("id" in x.attrs)) {
                    continue
                }else if (x.tag == "te2" && ("token_id" in x.attrs)) {
                    continue
                }
                var temp = [x.tag, x.attrs, x.content]
                relay_content.push(temp)
            }
            t.content = relay_content
        }
        var temp = [t.tag, t.attrs, t.content]
        voip_info.push(temp)
    }

    var payload = ["offer", call_info, voip_info]

    var offer = {
        elapsed_msec: node.attrs.e,
        epoch_msec: node.attrs.t + "000",
        is_offline: undefined,
        payload: payload,
        peer_app_version: node.attrs.version,
        peer_jid: node.attrs.from,
        peer_platform: node.attrs.platform,
    }
    //console.log(offer)
    //console.dir(offer, {depth:null, colors:true})
    wavoip.getNumParticipantsFromCallOffer(offer, function(x: any) {
        //console.log("getNumParticipantsFromCallOffer =>", x)
        wavoip.handleIncomingSignalingOffer(offer, true, 5)
        console.log("handled offer")
    })
}

export function initialize_wavoip(sock:any, state: AuthenticationState) {
    baileys_sock = sock
    baileys_state = state
    var jid = sock.user?.id
    wavoip.init(jid, true, true, true, false)

    //I just hardcoded my camera and audio devices :)
    //wavoip.getAVDevices(function (t: any){console.log("getavdevice", t)})
    wavoip.registerAVDeviceChangedCallback(function (){})
    wavoip.registerAVDeviceStatusChangedCallback(function (e:any, r:any, n:any, i:any){}) 
    // You can use the above 3 functions or hardcode your audio device as well

    wavoip.registerEventCallback(EventCallback)
    wavoip.registerSignalingXmppCallback(XmppCallback)
    wavoip.registerLoggingCallback(LoggingCallback)
    var audio = {
    //"0": "\\\\?\\SWD#MMDEVAPI#{0.0.1.00000000}.{ae7328e3-d6a9-405b-8846-95ce9387699a}#{2eef81be-33fa-4800-9670-1cd474972c3f}",
    "0": "\\\\?\\SWD#MMDEVAPI#{0.0.1.00000000}.{ec86b6ff-de92-40eb-8e08-247fad34a210}#{2eef81be-33fa-4800-9670-1cd474972c3f}",
   // "1": "\\\\?\\SWD#MMDEVAPI#{0.0.0.00000000}.{6e226f1b-93af-4e2a-82d3-bde0029a787e}#{e6327cad-dcec-4949-ae8a-991e976a79d2}"
   "1": ""
    }
    //wavoip.selectCamera('\\\\?\\USB#VID_0BDA&PID_579C&MI_00#6&d4d66ce&0&0000#{e5323777-f976-4f5b-9b55-b94699c46e44}\\GLOBAL')
    //wavoip.selectAudio(audio['0'],audio['1'], function (){})
    //wavoip.setLogPath('C:\\Users\\New\\Desktop\\voip_crash_log.txt')

    wavoip.updateNetworkMedium(2,0)

    wavoip.setScreenSize(1920,1080)
    wavoip.updateAudioVideoSwitch(true)
    
    
    sock.ws.on(`CB:call`, (node: BinaryNode) => {
      handle_call(node)
    })
  
    sock.ws.on(`CB:ack,class:call`, (node: BinaryNode) => {
      handleAckfromSocket(node)
    })

    console.log("started")
}

export function sendAcceptToWavoip() {
    wavoip.acceptCall(true, true)
}

export function handle_call(node: BinaryNode){
    if (!(node.content && (typeof(node.content[0]) == 'object'))) { return }

    switch(node.content[0].tag) {
        case "offer":
            handleOffer(node)
            break
        case "relaylatency":
        case "transport":
        case "terminate":
        case "preaccept":
        case "accept":
            handleEventfromSocket(node)
            break
        case "receipt": 
            sendCustomAck(node, baileys_sock)
            break
    }
}

export function handleAckfromSocket(node: BinaryNode) {
    console.log("passing ack to wavoip")
    var ack_obj_n : any= {
        error: 0,
        peer_jid: node.attrs.from,
        type: node.attrs.type
    }
    ack_obj_n.ack = BinaryNodetoObject(node)
    wavoip.handleIncomingSignalingAck(ack_obj_n)
}

export async function startCall(jid: string) {
    var call_id = generateMessageID() + generateMessageID()
    wavoip.startMD(jid + "@s.whatsapp.net", [jid + ".0:24@s.whatsapp.net", jid + ".0:26@s.whatsapp.net", jid + ".0:27@s.whatsapp.net", jid + ".0:0@s.whatsapp.net"], call_id, false)
}

function format_attrs(attrs: any) : attrs_format{
    for (var key of Object.keys(attrs)) {
        if (key == "call-creator" || key == "jid") {
            attrs[key] = jidEncode(attrs[key].user, "s.whatsapp.net", attrs[key].device)
        }

        if (typeof(attrs[key]) != "string") {
            attrs[key] = attrs[key].toString()
        }
    }

    return attrs
}

async function objectToBinaryNode(obj: any): Promise<BinaryNode> {
    var node: BinaryNode = {
        tag: obj[0],
        attrs: obj[1] ? format_attrs(obj[1]) : {}
    }

    if (obj[2]) {
        if (node.tag == "to") {
            //console.log(node)
            node.content = [await encmsg(new Uint8Array(obj[2][0][2]), [node.attrs.jid], baileys_sock)]
        }
        else if (obj[2][0] instanceof Array) {
            node.content = []

            if (obj[2][0][0] == "to") {
                console.dir(obj[2] , {depth: null, colors: true})
            }

            for (var con of obj[2]) {
                if(con[0] == "to" && con[1].jid.device == 26) continue
                node.content.push(await objectToBinaryNode(con))
            }
        }
        else {
            node.content = new Uint8Array(obj[2])
        }
    }

    return node
}

function format_attrs_rev(attrs: any) {
    for (var key of Object.keys(attrs)) {
        if (isJidUser(attrs[key])) {
            attrs[key] = jidStringToObj(attrs[key])
        }
    }
    return attrs
}

function BinaryNodetoObject(node: BinaryNode) {
    var result : any[] = [node.tag, format_attrs_rev(node.attrs), node.content]
    if (node.content == undefined) {
        result[2] = null
    }
    else if (node.content instanceof Uint8Array) {
        result[2] = Array.from(node.content)
    }
    else if (typeof node.content == 'object') {
        result[2]= []
        for (var xnode of node.content) {
            result[2].push(BinaryNodetoObject(xnode))
        }
    }

    return result
}
