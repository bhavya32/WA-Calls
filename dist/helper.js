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
exports.decodePkmsg = exports.uint8toarray = void 0;
const baileys_1 = require("@adiwajshing/baileys");
function uint8toarray(array) {
}
exports.uint8toarray = uint8toarray;
function decodePkmsg(from, array, baileys_state, e2etype) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        var msgBuffer = yield (0, baileys_1.decryptSignalProto)(from, e2etype, array, baileys_state);
        if (!(msgBuffer instanceof Buffer)) {
            console.log("Error decrypting");
        }
        //console.log(msgBuffer)
        let msg = baileys_1.proto.Message.decode((0, baileys_1.unpadRandomMax16)(msgBuffer));
        //console.log(msg)
        return ((_a = msg.call) === null || _a === void 0 ? void 0 : _a.callKey) || new Uint8Array;
    });
}
exports.decodePkmsg = decodePkmsg;
