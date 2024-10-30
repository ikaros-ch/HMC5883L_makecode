//% color=#0fbc11 icon="\uf2c2" block="HMC5883L"
namespace HMC5883L {
    let gain = 0.92;  // Default gain for 1.3 Gauss
    let declinationRadians = 0; // Declination angle in radians
    const address = 0x1E;  // I2C address of HMC5883L

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

    //% block="initialize HMC5883L with gauss %gauss declination %degrees degrees %minutes minutes"
    export function initialize(gauss: string = "1.3", degrees: number = 0, minutes: number = 0): void {
        if (GAIN_MAP[gauss]) {
            const [regValue, gainValue] = GAIN_MAP[gauss];
            gain = gainValue;
            pins.i2cWriteNumber(address, (0x01 << 8) | regValue, NumberFormat.UInt16BE);
        }
        declinationRadians = ((degrees + minutes / 60) * Math.PI) / 180;

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
        const degrees = heading(x, y);
        return `X: ${x.toFixed(2)}, Y: ${y.toFixed(2)}, Z: ${z.toFixed(2)}, Heading: ${degrees}°`;
    }
}
