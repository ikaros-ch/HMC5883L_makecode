//% color=#0fbc11 icon="\uf2c2" block="HMC5883L"
namespace HMC5883L {
    const address = 0x1E;  // I2C address of HMC5883L

    // Constants for configuration
    const GAIN = "1.3";  // Constant gain for 1.3 Gauss
    const DECLINATION_DEGREES = 0; // Constant declination in degrees
    const DECLINATION_MINUTES = 0; // Constant declination in minutes

    let gain = 0.92;  // Default gain value for 1.3 Gauss
    let declinationRadians = 0; // Declination angle in radians

    const GAIN_MAP: { [key: string]: [number, number] } = {
        "0.88": [0 << 5, 0.73],
        "1.3": [1 << 5, 0.92],
        "1.9": [2 << 5, 1.22],
        "2.5": [3 << 5, 1.52],
        "4.0": [4 << 5, 2.27],
        "4.7": [5 << 5, 2.56],
        "5.6": [6 << 5, 3.03],
        "8.1": [7 << 5, 4.35]
    };

    //% block="initialize HMC5883L sensor"
    export function initialize(): void {
        if (GAIN_MAP[GAIN]) {
            const [regValue, gainValue] = GAIN_MAP[GAIN];
            gain = gainValue;
            pins.i2cWriteNumber(address, (0x01 << 8) | regValue, NumberFormat.UInt16BE);
        }
        declinationRadians = ((DECLINATION_DEGREES + DECLINATION_MINUTES / 60) * Math.PI) / 180;

        // Configuration register A: 0b01110000 -> 8 samples, 15Hz output, normal mode
        pins.i2cWriteNumber(address, (0x00 << 8) | 0b01110000, NumberFormat.UInt16BE);
        // Set mode register to continuous mode
        pins.i2cWriteNumber(address, (0x02 << 8) | 0x00, NumberFormat.UInt16BE);
    }

    //% block="read HMC5883L"
    export function read(): [number, number, number] {
        let data = pins.i2cReadBuffer(address, 6);

        let x = (data[0] << 8) | data[1];
        let z = (data[2] << 8) | data[3];
        let y = (data[4] << 8) | data[5];

        // Convert to signed 16-bit
        x = x > 0x7FFF ? x - 0x10000 : x;
        y = y > 0x7FFF ? y - 0x10000 : y;
        z = z > 0x7FFF ? z - 0x10000 : z;

        x = Math.round(x * gain * 100) / 100;
        y = Math.round(y * gain * 100) / 100;
        z = Math.round(z * gain * 100) / 100;

        return [x, y, z];
    }

    //% block="calculate heading from X %x Y %y"
    export function heading(x: number, y: number): number {
        let headingRad = Math.atan2(y, x);
        headingRad += declinationRadians;

        if (headingRad < 0) headingRad += 2 * Math.PI;
        if (headingRad > 2 * Math.PI) headingRad -= 2 * Math.PI;

        return Math.round((headingRad * 180) / Math.PI);
    }

    //% block="formatted result"
    export function formatResult(): string {
        const [x, y, z] = read();
        const degrees = heading(x, y); // Calculate heading from x and y

        // Simulate toFixed(2) by rounding to two decimal places
        const xFormatted = Math.round(x * 100) / 100;
        const yFormatted = Math.round(y * 100) / 100;
        const zFormatted = Math.round(z * 100) / 100;

        return `X: ${xFormatted}, Y: ${yFormatted}, Z: ${zFormatted}, Heading: ${degrees}°`;
    }
}
