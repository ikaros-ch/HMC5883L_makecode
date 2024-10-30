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

    let xValue = 0;
    let yValue = 0;
    let zValue = 0;

    //% block="initialize HMC5883L sensor"
    export function initialize(): void {
        // Setup gain
        if (GAIN_MAP[GAIN]) {
            const [regValue, gainValue] = GAIN_MAP[GAIN];
            gain = gainValue;
            pins.i2cWriteNumber(address, (0x01 << 8) | regValue, NumberFormat.UInt16BE);
        }
        // Convert declination to radians
        declinationRadians = ((DECLINATION_DEGREES + DECLINATION_MINUTES / 60) * Math.PI) / 180;

        // Set up Configuration Register A: 0x00
        pins.i2cWriteNumber(address, (0x00 << 8) | 0b01110000, NumberFormat.UInt16BE); // 8 samples, 15Hz output, normal mode
        // Set mode register to continuous measurement mode: 0x02
        pins.i2cWriteNumber(address, (0x02 << 8) | 0x00, NumberFormat.UInt16BE);
    }

    function updateReadings(): void {
        let data = pins.i2cReadBuffer(address, 6);

        // Extract raw data values
        xValue = (data[0] << 8) | data[1];
        zValue = (data[2] << 8) | data[3];
        yValue = (data[4] << 8) | data[5];

        // Convert to signed 16-bit integers if necessary
        xValue = xValue > 0x7FFF ? xValue - 0x10000 : xValue;
        yValue = yValue > 0x7FFF ? yValue - 0x10000 : yValue;
        zValue = zValue > 0x7FFF ? zValue - 0x10000 : zValue;

        // Apply gain
        xValue = Math.round(xValue * gain * 100) / 100;
        yValue = Math.round(yValue * gain * 100) / 100;
        zValue = Math.round(zValue * gain * 100) / 100;
    }

    //% block="read X axis"
    export function readX(): number {
        updateReadings();
        return xValue;
    }

    //% block="read Y axis"
    export function readY(): number {
        updateReadings();
        return yValue;
    }

    //% block="read Z axis"
    export function readZ(): number {
        updateReadings();
        return zValue;
    }

    //% block="calculate heading"
    export function heading(): number {
        updateReadings(); // Ensure we have the latest readings
        let headingRad = Math.atan2(yValue, xValue);
        headingRad += declinationRadians;

        if (headingRad < 0) headingRad += 2 * Math.PI;
        if (headingRad > 2 * Math.PI) headingRad -= 2 * Math.PI;

        return Math.round((headingRad * 180) / Math.PI); // Convert to degrees
    }

    // Custom function to format numbers to 2 decimal places
    function formatToFixed(num: number, decimals: number): string {
        const factor = Math.pow(10, decimals);
        return (Math.round(num * factor) / factor).toString();
    }

    //% block="formatted result"
    export function formatResult(): string {
        updateReadings();
        const degrees = heading();

        return `X: ${formatToFixed(xValue, 2)}, Y: ${formatToFixed(yValue, 2)}, Z: ${formatToFixed(zValue, 2)}, Heading: ${degrees}°`;
    }
}
