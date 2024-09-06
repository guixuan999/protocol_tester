const { crc16 } =require('../utils.cjs')

class MacFrameQuery {
    constructor(BufferOrCmd) {
        this.bad = false  // indicate if this is a bad one
        this.info = "" // indicate the information for bad one

        if(BufferOrCmd === null || BufferOrCmd === undefined) {
            this.bad = true
            return
        } else if(BufferOrCmd.constructor.name == 'Number') {
            this.cmd = BufferOrCmd
        } else if(BufferOrCmd.constructor.name == 'Buffer') {
            // check length
            if(BufferOrCmd.length != 20) {
                this.bad = true
                this.info = "bad length"
                return
            }
            // check CRC, for Query, gateway_token is not for calculation
            const crc = (BufferOrCmd[BufferOrCmd.length - 2] << 8) + BufferOrCmd[BufferOrCmd.length - 1]
            const calculated_crc = crc16(BufferOrCmd.slice(0, BufferOrCmd.length - 2))
            if(crc != calculated_crc) {
                this.bad = true
                this.info = "bad crc"
                return
            }

            // check if broadcast addr
            if(BufferOrCmd.readUInt32BE(1) != 0xFFFFFFFF) {
                this.bad = true
                this.info = "device_id should be broadcast address"
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

class MacFrameRegAccept {
    constructor(BufferOrCmd) {
        this.bad = false  // indicate if this is a bad one
        this.info = "" // indicate the information for bad one

        if(BufferOrCmd === null || BufferOrCmd === undefined) {
            this.bad = true
            return
        } else if(BufferOrCmd.constructor.name == 'Number') {
            this.cmd = BufferOrCmd
        } else if(BufferOrCmd.constructor.name == 'Buffer') {
            // check length
            if(BufferOrCmd.length != 10) {
                this.bad = true
                this.info = "bad length"
                return
            }
            // check CRC, for Query, gateway_token is not for calculation
            const crc = (BufferOrCmd[BufferOrCmd.length - 2] << 8) + BufferOrCmd[BufferOrCmd.length - 1]
            const calculated_crc = crc16(BufferOrCmd.slice(0, BufferOrCmd.length - 2))
            if(crc != calculated_crc) {
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

class MacFrame {
    static CMD_Up = 0x00
    static CMD_Down = 0x10
    static CMD_Ack = 0x20
    static CMD_Query = 0x30
    static CMD_RegRequest = 0x40
    static CMD_RegAccept = 0x50
    static CMD_RequireReg = 0x60

    static from(buffer) {
        let cmd = buffer[0]
        switch(cmd) {
        case this.CMD_Down:
            break
        case this.CMD_Ack:
            break
        case this.CMD_Query:
            return new MacFrameQuery(buffer)
            break
        case this.CMD_RegAccept:
                break
        case this.CMD_RequireReg:
            break
        }        
        return null
    }
}

module.exports = { MacFrame, MacFrameQuery }