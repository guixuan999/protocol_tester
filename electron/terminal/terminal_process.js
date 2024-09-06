let settings = JSON.parse(process.argv[2])
let gateway_token
let short_addr

console.log(`terminal process created! device_id=${settings.device_id}`)

process.on("message", (message) => {
    // message.data.raw: A Buffer object (like  <Buffer 50 74 32 00 88 9a cc dd 81 6b> ) send() from main proces will transformed to an object like:
    // {
    //     type: 'Buffer',
    //     data: [
    //             80, 116,  50,   0,
    //             136, 154, 204, 221,
    //             129, 107
    //     ]
    // }
    console.log(`terminal with device_id ${settings.device_id} message in:`,  message.type, message.data)
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
        if(message.data.bad) {
            console.log("bad RF in package, discard...")
        } else if((message.data.device_id != settings.device_id) ||
                  (message.data.short_addr != short_addr)) {
            console.log(`RF in package not for me(device_id ${settings.device_id}), discard...`)
        } else {
            console.log(`RF in package for me(device_id ${settings.device_id}), parsing...`)
        } 
    }
})