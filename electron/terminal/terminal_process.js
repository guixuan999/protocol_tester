import { CMD_NAME_MAP, MacFrame, MacFrameRegRequest } from "./mac_frames.cjs"
import { getRandomInt } from "../utils.cjs"
let settings = JSON.parse(process.argv[2])
let gateway_token
let nonce
let short_addr
let frame_seq = 0

console.log(`terminal process created! device_id=${settings.device_id}`)

function generate_seq() {
    if (frame_seq == 256) {
        frame_seq = 0
    }
    return frame_seq++
}

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
    if (message.type == "RF_IN") {
        let frame = message.data
        if (frame.bad) {
            console.log("bad RF in package, discard...")
        } else if ((frame.device_id != settings.device_id) && (frame.device_id != 0xFFFFFFFF)) {
            console.log(`RF in package not for me(device_id ${settings.device_id}), discard...`)
        } else {
            console.log(`RF in package for me(device_id ${settings.device_id}), processing...`)
            switch (frame.cmd) {
                case MacFrame.CMD_Query:
                    if (gateway_token === undefined) {
                        console.log(`[dev ${settings.device_id}] update gateway_token=${frame.gateway_token}`)
                        gateway_token = frame.gateway_token
                    }
                    if (nonce === undefined) {
                        console.log(`[dev ${settings.device_id}] initial update nonce=${frame.nonce}`)
                        nonce = frame.nonce
                    }

                    if (short_addr === undefined) {
                        // send RegRequest
                        let f = new MacFrameRegRequest(MacFrame.CMD_RegRequest)
                        f.device_id = settings.device_id
                        f.frame_seq = generate_seq()

                        let { response, delay, bad_crc } = calulateResponseParams(frame.cmd)
                        console.log("delay =", delay)
                        if(response) {
                            setTimeout(() => {
                                process.send({
                                    type: "RF_OUT",
                                    data: f,
                                    bad_crc
                                })
                            }, delay)
                        }
                    }
                    break
            }
        }
    }
})

function calulateResponseParams(cmd) {
    let on = settings.on
    let response = true, delay = 0, bad_crc = false
    for(const item of on) {
        if(CMD_NAME_MAP[cmd].toLowerCase() == item.msg_type.toLowerCase()) {
            response = item.ack
            if(response) {
                delay = item.delay_min
                if(item.delay_rand) {
                    delay = getRandomInt(item.delay_min, item.delay_max)
                }
                bad_crc = item.bad_crc
            }
            break
        }
    }
    return { response, delay, bad_crc }
}