import { CMD_NAME_MAP, MacFrame, MacFrameRegRequest } from "./mac_frames.cjs"
import { getRandomInt } from "../utils.cjs"
let settings = JSON.parse(process.argv[2])
let gateway_token
let nonce
let short_addr
let frame_seq = 0

let PacketAssembly = { // for Down frames
    state: "pre",   // "pre": waiting for start bit
                    // "started": start bit received (and waiting for middle packages or stop bit)
                    // "stopped": stop bit received (currently not used)
    current_seq: 0, // the frame_seq of last received package
    package: [],    // append bytes for each expected package here 
    timer: null,    // timer create by setTimeout()
}

console.log(`terminal process created! device_id=${settings.device_id}`)

function generate_seq() {
    if (frame_seq == 256) {
        frame_seq = 0
    }
    return frame_seq++
}

process.on("message", (message) => {
    console.log(`terminal with device_id ${settings.device_id} message in:`, message)
    // message looks like:
    // {
    //     type: 'RF_IN',
    //     data: {
    //         bad: false,
    //         info: '',
    //         cmd: 48,
    //         device_id: 4294967295,
    //         frame_seq: 0,
    //         nonce: 4911,
    //         gateway_token: 31425,
    //         key: 12306,
    //         Q: 32
    //     }
    // }
    if (message.type == "RF_IN") {
        let frame = message.data
        if (frame.bad) {
            console.log("bad RF in package, discard...")
        } else if ((frame.device_id != settings.device_id) && (frame.device_id != 0xFFFFFFFF) && (frame.short_addr != short_addr)) {
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
                        if (response) {
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
                case MacFrame.CMD_RegAccept:
                    console.log(`[dev ${settings.device_id}] update short_addr=${frame.short_addr}`)
                    short_addr = frame.short_addr
                    break
                case MacFrame.CMD_RequireReg:
                    if (typeof short_addr != "undefined") {
                        console.log(`[dev ${settings.device_id}] update gateway_token=${frame.gateway_token}`)
                        gateway_token = frame.gateway_token

                        console.log(`[dev ${settings.device_id}] update nonce=${frame.nonce}`)
                        nonce = frame.nonce

                        // send RegRequest
                        let f = new MacFrameRegRequest(MacFrame.CMD_RegRequest)
                        f.device_id = settings.device_id
                        f.frame_seq = generate_seq()

                        let { response, delay, bad_crc } = calulateResponseParams(frame.cmd)
                        console.log("delay =", delay)
                        if (response) {
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
                case MacFrame.CMD_Down:
                    console.log("Down: ", frame)
                    // 分包拼接
                    let assembled = assemble(frame)
                    if(assembled) {
                        const hexString = assembled.toString("hex");
                        const formattedString = `Byte[${hexString.length / 2}]=> [ ${hexString.match(/.{1,2}/g).join(' ')} ]`;
                        console.log("Assembled Data from Down-Frames:", formattedString)
                    }
                    break
            }
        }
    }
})

function calulateResponseParams(cmd) {
    let on = settings.on
    let response = true, delay = 0, bad_crc = false
    for (const item of on) {
        if (CMD_NAME_MAP[cmd].toLowerCase() == item.msg_type.toLowerCase()) {
            response = item.ack
            if (response) {
                delay = item.delay_min
                if (item.delay_rand) {
                    delay = getRandomInt(item.delay_min, item.delay_max)
                }
                bad_crc = item.bad_crc
            }
            break
        }
    }
    return { response, delay, bad_crc }
}

function assemble(frame) {
    switch(PacketAssembly.state) {
        case "pre":
            if(frame.start_bit) { // we only accept start bit in this state
                if(frame.stop_bit) {
                    return Buffer.from(frame.data.data)
                }
                PacketAssembly.package.length = 0
                frame.data.data.forEach(byte => PacketAssembly.package.push(byte))
                PacketAssembly.current_seq = frame.frame_seq
                PacketAssembly.timer = setTimeout(() => {
                    console.log("Assemble Timeout!!!")
                    PacketAssembly.package.length = 0
                    PacketAssembly.timer = null
                    PacketAssembly.state = "pre"
                }, 10000)
                PacketAssembly.state = "started"
            }
            break
        case "started":
            if(((PacketAssembly.current_seq + 1) % 255) == frame.frame_seq) {
                if(!frame.start_bit) { // we don't accept start bit followed by another start bit
                    if(frame.stop_bit) {
                        clearTimeout(PacketAssembly.timer)
                        PacketAssembly.timer = null

                        frame.data.data.forEach(byte => PacketAssembly.package.push(byte))
                        let r = Buffer.from(PacketAssembly.package)
                        PacketAssembly.package.length = 0
                        PacketAssembly.state = "pre"
                        return r
                    } else {
                        frame.data.data.forEach(byte => PacketAssembly.package.push(byte))
                        PacketAssembly.current_seq = frame.frame_seq
                    }
                }    
            }
            break
    }
    return null
}