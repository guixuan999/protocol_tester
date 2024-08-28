class Radio {
    constructor(params) {
        this.params = params
        this.cb_init = null
        this.cb_receive = null
        this.cb_deinit = null
        this.initialized = false
    }

    init() {}

    onInit(callback) {
        this.cb_init = callback
    }

    onDeinit(callback) {
        this.cb_deinit = callback
    }

    onReceive(callback) {
        this.cb_receive = callback
    }

    transmit(frame) {

    }

}

export default Radio