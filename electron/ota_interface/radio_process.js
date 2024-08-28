import SerialRadio from './serial_radio.js'

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const radio = new SerialRadio(JSON.parse(process.argv[2]))

radio.onInit(function(data) {
  console.log("init:", data)
})

radio.onReceive(function(data) {
  console.log("received:", data)
})
radio.init()
await sleep(1); 


