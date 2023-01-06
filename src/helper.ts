import { AuthenticationState, BinaryNode, decryptSignalProto, jidDecode, proto, unpadRandomMax16 } from "@adiwajshing/baileys";

export async function decodePkmsg(from: string, array: Uint8Array, baileys_state: AuthenticationState, e2etype: "pkmsg" | "msg") : Promise<Uint8Array>{
    var msgBuffer : any = await decryptSignalProto(from, e2etype, array as Buffer, baileys_state)
    if (!(msgBuffer instanceof Buffer)) {
        console.log("Error decrypting")
    } 
    let msg: proto.IMessage = proto.Message.decode(unpadRandomMax16(msgBuffer))
    return msg.call?.callKey || new Uint8Array
}

export type attrs_format = {
    [key: string]: string;
}

export async function encmsg(buffer: Uint8Array, jids: string[], baileys_sock: any) : Promise<BinaryNode> {
    var msg: proto.IMessage = {
        call:{
            callKey: buffer
        },
        messageContextInfo: {}
    }
    console.log(jids)
    await baileys_sock.assertSessions(jids, false)
    const patched = await baileys_sock.createParticipantNodes(jids, msg)
    return patched.nodes[0].content[0]
}

export function jidStringToObj(jid: string) : Object {
    var return_obj: {[key: string]: any} = {_jid:{}}
    var jid_obj = jidDecode(jid)
        if (jid_obj) {
            return_obj._jid = {
                user: jid_obj.user,
                type: jid_obj.device ? 1 : 0
            }

            if (jid_obj.device) {
                return_obj._jid.device = jid_obj.device
                return_obj._jid.domainType = 0
            }
            else {
                return_obj._jid.server = "s.whatsapp.net"
            }
        }
    return return_obj
}

export async function sendCustomAck(node: BinaryNode, sock: any){
    var stanza: BinaryNode = {
        tag: 'ack',
        attrs: {
            id: node.attrs.id,
            to: node.attrs.from,
            class: node.tag,
        }
    }

    if(node.tag == 'call' && (node.content instanceof Array)) {
        stanza.attrs.type = node.content[0].tag
    }

    //send from attr if receipt
    if (node.tag == "receipt") {
        var jid = jidDecode(sock.user?.id)
        stanza.attrs.from = jid?.user + "@s.whatsapp.net"
    }

    await sock.sendNode(stanza)
}