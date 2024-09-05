
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function get_now_str() {
    const now = new Date();

    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0'); // 月份从 0 开始，所以要加 1
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const milliseconds = String(now.getMilliseconds()).padStart(3, '0');

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${milliseconds}`;
}

function crc16(buffer) {
    let crc = 0xFFFF; // 初始值，可以根据需求更改
    const polynomial = 0x18005; // 二进制 1,1000,0000,0000,0101 对应多项式 x^16+x^15+x^2+1

    for (let i = 0; i < buffer.length; i++) {
        crc ^= (buffer[i] << 8); // 把当前字节移到高位
        
        for (let j = 0; j < 8; j++) {
            if (crc & 0x8000) { // 判断最高位是否为1
                crc = (crc << 1) ^ polynomial; // 移位并异或多项式
            } else {
                crc <<= 1; // 直接移位
            }
            crc &= 0xFFFF; // 保持16位
        }
    }

    return crc;
}


module.exports = {get_now_str, crc16, sleep}