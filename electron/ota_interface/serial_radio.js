import Radio from "./radio.js"
import { SerialPort } from 'serialport'
import { InterByteTimeoutParser } from '@serialport/parser-inter-byte-timeout'


class SerialRadio extends Radio {
    init() {
        this.port = new SerialPort(this.params)
        var self = this
        this.port.open(function (err) {
            if (err) {
                if (self.cb_init) {
                    self.cb_init({
                        result: false,
                        info: err.toString()
                    })
                }
            } else {
                self.initialized = true
                if (self.cb_init) {
                    self.cb_init({
                        result: true,
                        info: "success"
                    })
                }
            }
        })

        const parser = this.port.pipe(new InterByteTimeoutParser({ interval: 'inter_frame_pause' in this.params ? this.params.inter_frame_pause : 5 }))
        var self = this
        parser.on('data', function (data) {
            if(self.cb_receive) {
                self.cb_receive(data)
            }
        })
    }

    transmit(frame) {
        if (this.initialized) {
            this.port.write(frame)
        } else {
            console.log("not initilized")
        }

    }
}

export default SerialRadio