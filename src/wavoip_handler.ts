var wavoip = require('./wavoip.node')
import { AuthenticationState, BinaryNode, decryptSignalProto, generateMessageID } from '@adiwajshing/baileys'
import { decodePkmsg } from './helper'

var baileys_sock: any
var baileys_state: AuthenticationState

function LoggingCallback() {
    //console.log(arguments)
}

function EventCallback() {
    //console.log(arguments)
}

function XmppCallback(call_id: any, from : any, node : any) {
    //console.log("to send =>", arguments)

    if (node[0] == "relaylatency") {
        sendRelayLatency(call_id, from, node)
    }
    else if (node[0] == "preaccept") {
        console.log("preacceptnode")
        //console.log(node)
        sendPreAccept(call_id, from, node)
    }
    else if (node[0] == "accept") {
        console.log("got accept ")
        accept_call(call_id, from, node)
    }
}

function BinaryNodetoObject(node: BinaryNode) {
    var result : any[] = [node.tag, node.attrs, node.content]
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

function handleTransport(node: BinaryNode) {
    var ack_node : BinaryNode = {
        tag: "ack",
        attrs: {
            to:node.attrs.from,
            id:node.attrs.id,
            type: "transport",
            class: "call"
        },
    }
    baileys_sock.sendNode(ack_node)

    var wavoip_ob = {
        elapsed_msec: undefined,
        epoch_msec: node.attrs.t + "000",
        is_offline: undefined,
        payload: [
            "transport",
            {
                "call-creator": {
                    "_jid": {
                        "type": 0,
                        "user": (node.content as any)[0].attrs["call-creator"].split("@")[0],
                        "server": "s.whatsapp.net"
                    }
                },
                "call-id": (node.content as any)[0].attrs["call-id"]
            },
            [
                ["te", (node.content as any)[0].content[0].attrs, Array.from((node.content as any)[0].content[0].content)],
                ["te", (node.content as any)[0].content[1].attrs, Array.from((node.content as any)[0].content[1].content)],
                ["net", (node.content as any)[0].content[2].attrs, null]
            ]
        ],
        peer_app_version: undefined,
        peer_jid: node.attrs.from,
        peer_platform: undefined
    }
    wavoip.handleIncomingSignalingMsg(wavoip_ob)
}


function accept_call(call_id: string, from: string, node: any) {
    console.log("Trying to accept the call now")
    var accept_node: BinaryNode = {
        tag: "call",
        attrs: {
            to: from,
            id: baileys_sock.generateMessageTag(),
        },
        content: [{
            tag: "accept",
            attrs: {
                'call-id': call_id,
                'call-creator': node[1]["call-creator"].user + "@s.whatsapp.net"
            },
            content: [{
                tag: "audio",
                attrs:node[2][0][1]
            }, {
                tag: "te",
                attrs: node[2][1][1],
                content: new Uint8Array(node[2][1][2]),
            }, {
                tag: "te",
                attrs: node[2][2][1],
                content: new Uint8Array(node[2][2][2]),
            }, {
                tag: "net",
                attrs: node[2][3][1]
            }, {
                tag: "encopt",
                attrs: node[2][4][1]
            }
            ]
        }]
    }
    baileys_sock.sendNode(accept_node)
}

function handleRelayLatency(node: BinaryNode) {
    var ack_node : BinaryNode = {
        tag: "ack",
        attrs: {
            to:node.attrs.from,
            id:node.attrs.id,
            type: "relaylatency",
            class: "call"
        },
    }
    baileys_sock.sendNode(ack_node)

    var wavoip_obj = {
        elapsed_msec: undefined,
        epoch_msec: node.attrs.t + "000",
        is_offline: undefined,
        payload: [
            "relaylatency",
            {
                "call-creator": {
                    _jid: {
                        "type": 0,
                        "user": (node.content as any)[0].attrs["call-creator"].split("@")[0],
                        "server": "s.whatsapp.net"
                    }
                },
                "call-id": (node.content as any)[0].attrs["call-id"]
            },
            [
                [
                    "te",
                    {
                        "latency": (node.content as any)[0].content[0].attrs.latency
                    },
                    Array.from((node.content as any)[0].content[0].content)
                ]
            ]
        ],
        peer_app_version: undefined,
        peer_jid: (node.content as any)[0].attrs["call-creator"],
        peer_platform: undefined
    }

    console.dir(wavoip_obj, {depth: null, colors: true})
    wavoip.handleIncomingSignalingMsg(wavoip_obj)
}

function sendRelayLatency(call_id: string, from: string, node: any) {
    var rl_node : BinaryNode = {
        tag:"call",
        attrs : {
            to: from,
            id: baileys_sock.generateMessageTag(),
        }, 
        content: [{
            tag: "relaylatency",
            attrs: {
                'call-id': call_id,
                'call-creator': node[1]['call-creator'].user + "@s.whatsapp.net",
            },
            content:[{
                tag: node[2][0][0],
                attrs:{
                    latency: node[2][0][1].latency
                },
                content: new Uint8Array(node[2][0][2])
            }]
        }]
    }

    baileys_sock.sendNode(rl_node)
}

function sendPreAccept(call_id: string, from: string, node: any) {
    var pa_node : BinaryNode = {
        tag: "call",
        attrs: {
            to: from,
            id: baileys_sock.generateMessageTag(),
        },
        content: [{
            tag: "preaccept",
            attrs: {
                'call-id': call_id,
                'call-creator': node[1]['call-creator'].user + "@s.whatsapp.net",
            },
            content: [{
                tag: node[2][0][0],
                attrs:{enc: node[2][0][1].enc, rate:node[2][0][1].rate},
            },{
                tag: node[2][1][0],
                attrs: {keygen: node[2][1][1].keygen},
            }, {
                tag: node[2][2][0],
                attrs: {ver: node[2][2][1].ver},
                content: new Uint8Array(node[2][2][2])
            }
            ]
        }]
    }

    console.dir(pa_node, {depth:null, colors:true})
    baileys_sock.sendNode(pa_node)
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
    console.log("sent_receipt")
}


async function handleOffer(node:BinaryNode) {
    console.log("Offer Received")
    
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
    console.dir(offer, {depth:null, colors:true})
    wavoip.getNumParticipantsFromCallOffer(offer, function(x: any) {
        console.log("getNumParticipantsFromCallOffer =>", x)
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
    "0": "\\\\?\\SWD#MMDEVAPI#{0.0.1.00000000}.{ae7328e3-d6a9-405b-8846-95ce9387699a}#{2eef81be-33fa-4800-9670-1cd474972c3f}",
    "1": "\\\\?\\SWD#MMDEVAPI#{0.0.0.00000000}.{6e226f1b-93af-4e2a-82d3-bde0029a787e}#{e6327cad-dcec-4949-ae8a-991e976a79d2}"
    }
    wavoip.selectCamera('\\\\?\\USB#VID_0BDA&PID_579C&MI_00#6&d4d66ce&0&0000#{e5323777-f976-4f5b-9b55-b94699c46e44}\\GLOBAL')
    wavoip.selectAudio(audio['0'],audio['1'], function (){})
    //wavoip.setLogPath('C:\\Users\\New\\Desktop\\voip_crash_log.txt')

    wavoip.updateNetworkMedium(2,0)

    wavoip.setScreenSize(1920,1080)
    wavoip.updateAudioVideoSwitch(true)
    
}

function sendAcceptToWavoip() {
    wavoip.acceptCall(true, true)
}

export function handle_call(node: BinaryNode){
    if (!(node.content && (typeof(node.content[0]) == 'object'))) { return }
    if (node.content[0].tag == "offer") {
        //getparticipants()
        sendReceipt(node)
        handleOffer(node)
        setTimeout(sendAcceptToWavoip, 5000) 
    }
    else if (node.content[0].tag == "relaylatency") {
        handleRelayLatency(node)
    }
    else if (node.content[0].tag == "transport") {
        handleTransport(node)
    }
}

export function handle_ack(node: BinaryNode) {
    console.log("passing relaylatency ack to wavoip")
    var ack_obj = {
        ack: [
            "ack", {
                class:"call",
                from: {
                    _jid: {
                        server: "s.whatsapp.net",
                        type: 0,
                        user: node.attrs.from.split("@")[0]
                    }
                },
                id: node.attrs.id,
                type: node.attrs.type
            },
            null
        ],
        error: 0,
        peer_jid: node.attrs.from,
        type: node.attrs.type
    }
    wavoip.handleIncomingSignalingAck(ack_obj)
}
