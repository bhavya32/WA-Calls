import { AuthenticationState, decryptSignalProto, proto, unpadRandomMax16 } from "@adiwajshing/baileys";

export function uint8toarray(array: Uint8Array) {

}
export async function decodePkmsg(from: string, array: Uint8Array, baileys_state: AuthenticationState, e2etype: "pkmsg" | "msg") : Promise<Uint8Array>{
    var msgBuffer : any = await decryptSignalProto(from, e2etype, array as Buffer, baileys_state)
    if (!(msgBuffer instanceof Buffer)) {
        console.log("Error decrypting")
    } 
    //console.log(msgBuffer)

    let msg: proto.IMessage = proto.Message.decode(unpadRandomMax16(msgBuffer))
    //console.log(msg)
    return msg.call?.callKey || new Uint8Array
}