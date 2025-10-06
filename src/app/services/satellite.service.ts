import { Injectable } from '@angular/core'
import * as satellite from 'satellite.js'

@Injectable({ providedIn: 'root' })
export class SatelliteService {
  // Example TLE, used here only for mock/demo
  getExampleTLE() {
    return [
      'STARLINK-30766',
      '1 44714U 19074B   25267.24054441  .00006648  00000+0  46458-3 0  9990',
      '2 44714  53.0536 213.8386 0001402  96.9159 263.1990 15.06417707323669'
    ]
  }

  /**
   * Create a satrec object from TLE lines
   */
  tleToSatrec(tleLine1: string, tleLine2: string) {
    return satellite.twoline2satrec(tleLine1, tleLine2)
  }

  /**
   * Get ECI position (km) at a JS Date for a satrec
   * Returns { position, velocity } in km and km/s
   */
  propagate(satrec: any, when: Date) {
    const gmst = satellite.gstime(when)
    const eci = satellite.propagate(satrec, when)
    // eci.position is in km in TEME (when using SGP4)
    return {
      positionEci: eci?.position,
      velocityEci: eci?.velocity,
      gmst
    }
  }

  /**
   * Convert TEME/ECI coords to ECF (earth-fixed) coords.
   * Note: for plotting a full orbit you often want an inertial frame.
   * See notes in the component about ECI vs ECF.
   */
  eciToEcf(positionEci: any, gmst: number) {
    return satellite.eciToEcf(positionEci, gmst)
  }
}