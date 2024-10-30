HMC5883L.initialize()
basic.forever(function () {
    serial.writeValue("x", HMC5883L.heading())
})
