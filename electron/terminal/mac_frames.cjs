const { crc16, getRandomInt, appendToBuffer } = require('../utils.cjs')

// downlink
class MacFrameQuery {
    constructor(BufferOrCmd) {
        this.bad = false  // indicate if this is a bad one
        this.info = "" // indicate the information for bad one

        if (BufferOrCmd === null || BufferOrCmd === undefined) {
            this.bad = true
            return
        } else if (BufferOrCmd.constructor.name == 'Number') {
            this.cmd = BufferOrCmd
        } else if (BufferOrCmd.constructor.name == 'Buffer') {
            // check length
            if (BufferOrCmd.length != 20) {
                this.bad = true
                this.info = "bad length"
                return
            }
            // check CRC, for Query, gateway_token is not for calculation
            const crc = (BufferOrCmd[BufferOrCmd.length - 2] << 8) + BufferOrCmd[BufferOrCmd.length - 1]
            const calculated_crc = crc16(BufferOrCmd.slice(0, BufferOrCmd.length - 2))
            if (crc != calculated_crc) {
                this.bad = true
                this.info = "bad crc"
                return
            }

            // check if broadcast addr
            if (BufferOrCmd.readUInt32BE(1) != 0xFFFFFFFF) {
                this.bad = true
                this.cmd = BufferOrCmd[0]
                this.info = "bad Device ID"
                return
            }

            this.cmd = BufferOrCmd[0]
            this.device_id = BufferOrCmd.readUInt32BE(1)
            this.frame_seq = BufferOrCmd[5]
            this.nonce = BufferOrCmd.readUInt16BE(6)
            this.gateway_token = BufferOrCmd.readUInt32BE(8)
            this.key = BufferOrCmd.readUInt32BE(12)
            this.Q = BufferOrCmd.readUInt16BE(16)
        }
    }
}

// uplink
class MacFrameRegRequest {
    constructor(BufferOrCmd) {
        this.bad = false  // indicate if this is a bad one
        this.info = "" // indicate the information for bad one

        if (BufferOrCmd === null || BufferOrCmd === undefined) {
            this.bad = true
            return
        } else if (BufferOrCmd.constructor.name == 'Number') {
            this.cmd = BufferOrCmd
        } else if (BufferOrCmd.constructor.name == 'Buffer') {
            // not implemented!
        }
    }

    pack(gwToken, bad_crc) {
        var buffer = Buffer.alloc(6 + 4); // 6 bytes: CRC16 not included, 4 bytes: gateway_token for CRC16 calculation
        buffer[0] = this.cmd;

        buffer[1] = (this.device_id >> 24) & 0xFF;
        buffer[2] = (this.device_id >> 16) & 0xFF;
        buffer[3] = (this.device_id >> 8) & 0xFF;
        buffer[4] = this.device_id & 0xFF;

        buffer[5] = this.frame_seq & 0xFF;

        // caculate CRC
        buffer[6] = (gwToken >> 24) & 0xFF;
        buffer[7] = (gwToken >> 16) & 0xFF;
        buffer[8] = (gwToken >> 8) & 0xFF;
        buffer[9] = gwToken & 0xFF;
        let crc = crc16(buffer);
        if (bad_crc) {
            crc = crc + getRandomInt(1, 255)
        }
        buffer[6] = (crc >> 8) & 0xFF;
        buffer[7] = crc & 0xFF;

        return buffer.slice(0, 8)
    }
}

class MacFrameUp {
    constructor(BufferOrCmd) {
        this.bad = false  // indicate if this is a bad one
        this.info = "" // indicate the information for bad one

        if (BufferOrCmd === null || BufferOrCmd === undefined) {
            this.bad = true
            return
        } else if (BufferOrCmd.constructor.name == 'Number') {
            this.cmd = BufferOrCmd
        } else if (BufferOrCmd.constructor.name == 'Buffer') {
            // not implemented!
        }
    }

    pack(gwToken, bad_crc) {
        let len = 5; // 5: Data and CRC16 not included
        var buffer = Buffer.alloc(len);
        buffer[0] = this.cmd;
        buffer[1] = (this.short_addr >> 8) & 0xFF;
        buffer[2] = this.short_addr & 0xFF;
        buffer[3] = this.frame_seq & 0xFF;
        buffer[4] = (this.start_bit << 7) + (this.stop_bit << 6) + this.datalen;
        buffer = appendToBuffer(buffer, this.data);
        let token_buffer = Buffer.alloc(4)
        token_buffer[0] = (gwToken >> 24) & 0xFF;
        token_buffer[1] = (gwToken >> 16) & 0xFF;
        token_buffer[2] = (gwToken >> 8) & 0xFF;
        token_buffer[3] = gwToken & 0xFF;
        buffer = appendToBuffer(buffer, token_buffer);
        let crc = crc16(buffer);
        if (bad_crc) {
            crc = crc + getRandomInt(1, 255)
        }
        buffer[5 + this.datalen] = (crc >> 8) & 0xFF;
        buffer[5 + this.datalen + 1] = crc & 0xFF;
        return buffer.slice(0, 5 + this.datalen + 2)
    }
}

// downlink
class MacFrameRegAccept {
    constructor(BufferOrCmd, gwToken) {
        this.bad = false  // indicate if this is a bad one
        this.info = "" // indicate the information for bad one

        if (BufferOrCmd === null || BufferOrCmd === undefined) {
            this.bad = true
            return
        } else if (BufferOrCmd.constructor.name == 'Number') {
            this.cmd = BufferOrCmd
        } else if (BufferOrCmd.constructor.name == 'Buffer') {
            // check length
            if (BufferOrCmd.length != 10) {
                this.bad = true
                this.info = "bad length"
                return
            }
            // check CRC, for Query, gateway_token is included for calculation
            const crc = (BufferOrCmd[BufferOrCmd.length - 2] << 8) + BufferOrCmd[BufferOrCmd.length - 1]
            let token_buffer = Buffer.alloc(4)
            token_buffer[0] = (gwToken >> 24) & 0xFF;
            token_buffer[1] = (gwToken >> 16) & 0xFF;
            token_buffer[2] = (gwToken >> 8) & 0xFF;
            token_buffer[3] = gwToken & 0xFF;

            let b = appendToBuffer(BufferOrCmd.slice(0, BufferOrCmd.length - 2), token_buffer)
            const calculated_crc = crc16(b)

            if (crc != calculated_crc) {
                this.bad = true
                this.info = "bad crc"
                return
            }

            this.cmd = BufferOrCmd[0]
            this.device_id = BufferOrCmd.readUInt32BE(1)
            this.frame_seq = BufferOrCmd[5]
            this.short_addr = BufferOrCmd.readUInt16BE(6)
        }
    }
}

// downlink
class MacFrameDown {
    constructor(BufferOrCmd, gwToken) {
        this.bad = false  // indicate if this is a bad one
        this.info = "" // indicate the information for bad one

        if (BufferOrCmd === null || BufferOrCmd === undefined) {
            this.bad = true
            return
        } else if (BufferOrCmd.constructor.name == 'Number') {
            this.cmd = BufferOrCmd
        } else if (BufferOrCmd.constructor.name == 'Buffer') {
            // check length
            if (BufferOrCmd.length <= 7) {
                this.bad = true
                this.info = "bad length"
                return
            } else {
                let datalen = BufferOrCmd[4] & 0x3F
                if (datalen + 7 != BufferOrCmd.length) {
                    this.bad = true
                    this.info = "bad length"
                    return
                }
            }
            // check CRC, for Down, gateway_token is included for calculation
            const crc = (BufferOrCmd[BufferOrCmd.length - 2] << 8) + BufferOrCmd[BufferOrCmd.length - 1]
            let token_buffer = Buffer.alloc(4)
            token_buffer[0] = (gwToken >> 24) & 0xFF;
            token_buffer[1] = (gwToken >> 16) & 0xFF;
            token_buffer[2] = (gwToken >> 8) & 0xFF;
            token_buffer[3] = gwToken & 0xFF;

            let b = appendToBuffer(BufferOrCmd.slice(0, BufferOrCmd.length - 2), token_buffer)
            const calculated_crc = crc16(b)

            if (crc != calculated_crc) {
                this.bad = true
                this.info = "bad crc"
                return
            }

            this.cmd = BufferOrCmd[0]
            this.short_addr = BufferOrCmd.readUInt16BE(1)
            this.frame_seq = BufferOrCmd[3]
            this.start_bit = (BufferOrCmd[4] >> 7) & 0x01
            this.stop_bit = (BufferOrCmd[4] >> 6) & 0x01
            this.datalen = BufferOrCmd[4] & 0x3F

            this.data = BufferOrCmd.slice(5, 5 + this.datalen)
        }
    }
}

class MacFrameRequireReg {
    constructor(BufferOrCmd, gwToken) {
        this.bad = false  // indicate if this is a bad one
        this.info = "" // indicate the information for bad one

        if (BufferOrCmd === null || BufferOrCmd === undefined) {
            this.bad = true
            return
        } else if (BufferOrCmd.constructor.name == 'Number') {
            this.cmd = BufferOrCmd
        } else if (BufferOrCmd.constructor.name == 'Buffer') {
            // check length
            if (BufferOrCmd.length != 18) {
                this.bad = true
                this.info = "bad length"
                return
            }
            // check CRC, for Query, gateway_token is included for calculation
            const crc = (BufferOrCmd[BufferOrCmd.length - 2] << 8) + BufferOrCmd[BufferOrCmd.length - 1]
            let token_buffer = Buffer.alloc(4)
            token_buffer[0] = (gwToken >> 24) & 0xFF;
            token_buffer[1] = (gwToken >> 16) & 0xFF;
            token_buffer[2] = (gwToken >> 8) & 0xFF;
            token_buffer[3] = gwToken & 0xFF;

            let b = appendToBuffer(BufferOrCmd.slice(0, BufferOrCmd.length - 2), token_buffer)
            const calculated_crc = crc16(b)

            if (crc != calculated_crc) {
                this.bad = true
                this.info = "bad crc"
                return
            }

            this.cmd = BufferOrCmd[0]
            this.short_addr = BufferOrCmd.readUInt16BE(1)
            this.frame_seq = BufferOrCmd[3]
            this.nonce = BufferOrCmd.readUInt16BE(4)
            this.gateway_token = BufferOrCmd.readUInt32BE(6)
            this.key = BufferOrCmd.readUInt32BE(10)
            this.Q = BufferOrCmd.readUInt16BE(14)
        }
    }
}

class MacFrame {
    static CMD_Up = 0x00
    static CMD_Down = 0x10
    static CMD_Ack = 0x20
    static CMD_Query = 0x30
    static CMD_RegRequest = 0x40
    static CMD_RegAccept = 0x50
    static CMD_RequireReg = 0x60

    static from(buffer, gwToken) {
        let cmd = buffer[0]
        switch (cmd) {
            case this.CMD_Down:
                return new MacFrameDown(buffer, gwToken)
            case this.CMD_Ack:
                break
            case this.CMD_Query:
                return new MacFrameQuery(buffer)
            case this.CMD_RegAccept:
                return new MacFrameRegAccept(buffer, gwToken)
            case this.CMD_RequireReg:
                return new MacFrameRequireReg(buffer, gwToken)
        }
        return null
    }
}

const CMD_NAME_MAP = {
    [MacFrame.CMD_Up]: "Up",
    [MacFrame.CMD_Down]: "Down",
    [MacFrame.CMD_Ack]: "Ack",
    [MacFrame.CMD_Query]: "Query",
    [MacFrame.CMD_RegRequest]: "RegRequest",
    [MacFrame.CMD_RegAccept]: "RegAccept",
    [MacFrame.CMD_RequireReg]: "RequireReg"
}

module.exports = { CMD_NAME_MAP, MacFrame, MacFrameQuery, MacFrameRegRequest, MacFrameRegAccept, MacFrameRequireReg, MacFrameDown, MacFrameUp }