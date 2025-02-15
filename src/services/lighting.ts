interface TimeRange {
  start: number;
  end: number;
  maxBrightness: number;
  minBrightness: number;
}

interface Coordinates {
  latitude: number;
  longitude: number;
}

interface SunTimes {
  sunrise: Date;
  sunset: Date;
  solarNoon: Date;
}

interface LightState {
  brightness: number; // 5-100
  colorTemp: number; // 153-500 Mired
}

export class LightingService {
  private coordinates: Coordinates;

  constructor(coordinates: Coordinates) {
    this.coordinates = coordinates;
  }

  private calculateSunTimes(date: Date): SunTimes {
    // Convert date to Julian date
    const julianDate = this.dateToJulian(date);

    // Calculate solar noon
    const solarNoonHour = this.calculateSolarNoon(julianDate);
    const solarNoon = new Date(date);
    solarNoon.setHours(Math.floor(solarNoonHour));
    solarNoon.setMinutes(Math.round((solarNoonHour % 1) * 60));

    // Calculate sunrise and sunset
    const dayLength = this.calculateDayLength(julianDate);
    const sunrise = new Date(
      solarNoon.getTime() - (dayLength * 60 * 60 * 1000) / 2
    );
    const sunset = new Date(
      solarNoon.getTime() + (dayLength * 60 * 60 * 1000) / 2
    );

    return { sunrise, sunset, solarNoon };
  }

  private dateToJulian(date: Date): number {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();

    const a = Math.floor((14 - month) / 12);
    const y = year + 4800 - a;
    const m = month + 12 * a - 3;

    const jd =
      day +
      Math.floor((153 * m + 2) / 5) +
      365 * y +
      Math.floor(y / 4) -
      Math.floor(y / 100) +
      Math.floor(y / 400) -
      32045;

    return (
      jd +
      (date.getHours() - 12) / 24 +
      date.getMinutes() / 1440 +
      date.getSeconds() / 86400
    );
  }

  private calculateSolarNoon(julianDate: number): number {
    // Calculate solar mean anomaly
    const n = julianDate - 2451545.0;
    const L = 280.46 + 0.9856474 * n;
    const g = 357.528 + 0.9856003 * n;

    // Calculate equation of time
    const eqTime =
      229.18 *
      (0.000075 +
        0.001868 * Math.cos(g) -
        0.032077 * Math.sin(g) -
        0.014615 * Math.cos(2 * g) -
        0.040849 * Math.sin(2 * g));

    // Calculate solar noon
    const solarNoon = 12 + (this.coordinates.longitude * -4) / 60 - eqTime / 60;

    return solarNoon;
  }

  private calculateDayLength(julianDate: number): number {
    // Calculate solar declination
    const n = julianDate - 2451545.0;
    const L = 280.46 + 0.9856474 * n;
    const g = 357.528 + 0.9856003 * n;
    const lambda = L + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g);
    const epsilon = 23.439 - 0.0000004 * n;
    const sinDelta =
      Math.sin((epsilon * Math.PI) / 180) * Math.sin((lambda * Math.PI) / 180);
    const delta = (Math.asin(sinDelta) * 180) / Math.PI;

    // Calculate day length in hours
    const latRad = (this.coordinates.latitude * Math.PI) / 180;
    const hourAngle =
      (Math.acos(-Math.tan(latRad) * Math.tan((delta * Math.PI) / 180)) * 180) /
      Math.PI;
    const dayLength = (2 * hourAngle) / 15;

    return dayLength;
  }

  public getCurrentLightState(): LightState {
    const now = new Date();
    const sunTimes = this.calculateSunTimes(now);

    // Get current time in hours since midnight
    const currentHour = now.getHours() + now.getMinutes() / 60;

    // Convert sunrise and sunset to hours
    const sunriseHour =
      sunTimes.sunrise.getHours() + sunTimes.sunrise.getMinutes() / 60;
    const sunsetHour =
      sunTimes.sunset.getHours() + sunTimes.sunset.getMinutes() / 60;
    const solarNoonHour =
      sunTimes.solarNoon.getHours() + sunTimes.solarNoon.getMinutes() / 60;

    // Define transition periods (in hours relative to sunrise/sunset)
    const dawnLength = 1.5; // Dawn transition length
    const duskLength = 1.5; // Dusk transition length

    let brightness: number;
    let colorTemp: number;

    if (currentHour < sunriseHour - dawnLength) {
      // Night time
      brightness = 5;
      colorTemp = 500; // Warmest (2000K)
    } else if (currentHour < sunriseHour) {
      // Dawn transition
      const progress = (currentHour - (sunriseHour - dawnLength)) / dawnLength;
      brightness = Math.round(5 + progress * 35); // 5 to 50
      colorTemp = Math.round(500 - progress * 197); // 500 to 303 Mired (2000K to 3300K)
    } else if (currentHour < solarNoonHour) {
      // Morning
      const progress =
        (currentHour - sunriseHour) / (solarNoonHour - sunriseHour);
      brightness = Math.round(50 + progress * 50); // 50 to 100
      colorTemp = Math.round(303 - progress * 150); // 303 to 153 Mired (3300K to 6500K)
    } else if (currentHour < sunsetHour) {
      // Afternoon
      const progress =
        (currentHour - solarNoonHour) / (sunsetHour - solarNoonHour);
      brightness = Math.round(100 - progress * 50); // 100 to 50
      colorTemp = Math.round(153 + progress * 150); // 153 to 303 Mired (6500K to 3300K)
    } else if (currentHour < sunsetHour + duskLength) {
      // Dusk transition
      const progress = (currentHour - sunsetHour) / duskLength;
      brightness = Math.round(50 - progress * 35); // 50 to 15
      colorTemp = Math.round(303 + progress * 197); // 303 to 500 Mired (3300K to 2000K)
    } else {
      // Night time
      brightness = 5;
      colorTemp = 500; // Warmest (2000K)
    }

    return { brightness, colorTemp };
  }
}
