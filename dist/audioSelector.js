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
var wavoip = require('./wavoip.node');
var available_mics = [];
var available_speakers = [];
function handleDevices(devices) {
    return __awaiter(this, void 0, void 0, function* () {
        for (var device of devices) {
            if (device.deviceType == 0) {
                available_mics.push(device);
            }
            else if (device.deviceType == 1) {
                available_speakers.push(device);
            }
        }
        console.log("Available mics: ", available_mics);
        console.log("---------------------------------");
        console.log("Available speakers: ", available_speakers);
    });
}
wavoip.init("911234567890@s.whatsapp.net", true, true, true, false);
wavoip.getAVDevices(function (t) { handleDevices(t); });
