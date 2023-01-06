var wavoip = require('./wavoip.node')
var available_mics : any = []
var available_speakers : any = []

async function handleDevices(devices: any) {
  for (var device of devices) {
    if (device.deviceType == 0) {
        available_mics.push(device)
    }
    else if (device.deviceType == 1) {
        available_speakers.push(device)
    }
  }

  console.log("Available mics: ", available_mics)
  console.log("---------------------------------")
  console.log("Available speakers: ", available_speakers)

}

wavoip.init("911234567890@s.whatsapp.net", true, true, true, false)
wavoip.getAVDevices(function (t: any){handleDevices(t)})