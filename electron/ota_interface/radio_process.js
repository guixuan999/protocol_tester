import SerialRadio from './serial_radio.js'

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const radio = new SerialRadio(JSON.parse(process.argv[2]))

radio.onInit(function(data) {
  console.log("init:", data)
  process.send({code: "init", result: data.result, info: data.info})
  if(!data.result) {
    // if no this line, and when run to here this process will also exit, but with code 0
    process.exit(1)
  }
})

radio.onReceive(function(data) {
  console.log("received:", data)
  // 将 Buffer 转换为十六进制字符串
const hexString = data.toString('hex');

// 将十六进制字符串格式化为目标格式
const formattedString = `Byte[${hexString.length / 2}]=> [ ${hexString.match(/.{1,2}/g).join(' ')} ]`;
  process.send({code: "in", raw: formattedString})
})
radio.init()
await sleep(1); // no need this, just an example of sleep


