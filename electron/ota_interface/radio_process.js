import SerialRadio from './serial_radio.js'

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

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
await sleep(1); // no need this, just an example of sleep


