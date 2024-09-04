function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

let settings = JSON.parse(process.argv[2])

let i = 0
for(;;) {
    console.log(settings.device_id, "terminal_process BEEP", i)
    i++
    await sleep(1000)
}