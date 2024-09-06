import { MacFrame } from "./mac_frames.cjs"

let settings = JSON.parse(process.argv[2])
let gateway_token
let short_addr

console.log(`terminal process created! device_id=${settings.device_id}`)

process.on("message", (message) => {
    console.log(`terminal with device_id ${settings.device_id} message in:`, message)
    // message.data looks like:
    // {
    //     date: '2024-09-06 11:09:29.634',
    //     direction: 'IN',
    //     raw: {
    //         type: 'Buffer',
    //         data: [
    //             80, 116,  50,   0,
    //             136, 154, 204, 221,
    //             129, 107
    //         ]
    //     },
    //     bad: false,
    //     info: '',
    //     cmd: 'RegAccept',
    //     device_id: 1949433992,  // or short_addr, or both
    //     frame_seq: 154
    // }
    if(message.type == "RF_IN") {
        let frame = message.data
        if(frame.bad) {
            console.log("bad RF in package, discard...")
        } else if((frame.device_id != settings.device_id) && (frame.device_id != 0xFFFFFFFF)) {
            console.log(`RF in package not for me(device_id ${settings.device_id}), discard...`)
        } else {
            console.log(`RF in package for me(device_id ${settings.device_id}), processing...`)
        } 
    }
})