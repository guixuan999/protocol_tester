import SerialRadio from './serial_radio.js'
import {sleep} from '../utils.cjs'

const radio = new SerialRadio(JSON.parse(process.argv[2]))

radio.onInit(function (data) {
  console.log("init:", data)
  process.send({ code: "init", result: data.result, info: data.info })
  if (!data.result) {
    // if no this line, and when run to here this process will also exit, but with code 0
    process.exit(1)
  }
})

radio.onReceive(function (data) {
  console.log("received:", data)
  
  process.send({ code: "in", raw: data })
})
radio.init()

process.on("message", message => {
  // message looks like
  // {
  //     type: 'RF_OUT',
  //     data: {
  //       type: 'Buffer',
  //       data: [
  //         64, 0,   0,   0,
  //          1, 4, 174, 122
  //       ]
  //     }
  //   }
  if(message.type == 'RF_OUT') {
    radio.transmit(message.data.data)
  }
  
})
await sleep(1); // no need this, just an example of sleep


