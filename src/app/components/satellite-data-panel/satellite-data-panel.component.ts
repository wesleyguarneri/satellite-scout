import { Component, Input, OnChanges, OnDestroy, SimpleChanges } from '@angular/core';
import { AccordionModule } from 'primeng/accordion';
import { TableModule } from 'primeng/table';
import { TextareaModule } from 'primeng/textarea';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { NamedValue } from '../../models/named-value';
import { TleDetails } from '../../models/tle-details';
import * as satellite from 'satellite.js';
import type { PositionAndVelocity, EciVec3 } from 'satellite.js';

@Component({
  selector: 'app-satellite-data-panel',
  standalone: true,
  imports: [CommonModule, AccordionModule, TableModule, TextareaModule, FormsModule],
  templateUrl: './satellite-data-panel.component.html',
  styleUrls: ['./satellite-data-panel.component.css']
})
export class SatelliteDataPanelComponent implements OnChanges, OnDestroy {
  @Input({ required: true }) tle!: TleDetails;
  @Input({ required: true }) satrec!: any;

  activeTab: 'info' | 'charts' = 'info';
  infoData: NamedValue[] = [
    { name: 'latitude', value: '24.58136' },
    { name: 'longitude', value: '-126.20389' },
    { name: 'internalTemperature', value: '20C' },
    { name: 'accelerometer', value: 'x 30, y 20, z 30' },
    { name: 'barometricPressure', value: '0' }
  ];
  orbitData: NamedValue[] = [];
  tleData: NamedValue[] = [];
  locationData: NamedValue[] = [];
  otherData: NamedValue[] = [{ name: 'example', value: 'Other data goes here' }];
  private locationIntervalId: ReturnType<typeof setInterval> | null = null;

  ngOnChanges(_changes: SimpleChanges): void {
    if (this.satrec && this.tle) {
      this.tleData = this.buildTleDataFromSatrec(this.satrec, [this.tle.name, this.tle.line1, this.tle.line2]);
      this.refreshDynamicData();
      this.ensureLocationInterval();
    } else {
      this.clearLocationInterval();
    }
  }

  ngOnDestroy(): void {
    this.clearLocationInterval();
  }

  setActiveTab(tab: 'info' | 'charts') {
    this.activeTab = tab;
  }

  private refreshDynamicData(): void {
    if (!this.satrec) return;

    const now = new Date();
    const propagated = satellite.propagate(this.satrec, now);
    const position = propagated?.position;
    const velocity = propagated?.velocity;

    this.orbitData = this.buildOrbitDataFromSatrec(this.satrec, velocity);
    this.locationData = this.buildLocationData(position, now);
  }

  private ensureLocationInterval(): void {
    if (this.locationIntervalId || !this.satrec) return;
    this.locationIntervalId = setInterval(() => this.refreshDynamicData(), 5000);
  }

  private clearLocationInterval(): void {
    if (!this.locationIntervalId) return;
    clearInterval(this.locationIntervalId);
    this.locationIntervalId = null;
  }

  private buildOrbitDataFromSatrec(satrec: any, velocityVector?: PositionAndVelocity['velocity']): NamedValue[] {
    let velocityMagnitude = 'N/A';
    if (velocityVector) {
      const speed = Math.sqrt(
        velocityVector.x ** 2 + velocityVector.y ** 2 + velocityVector.z ** 2
      );
      velocityMagnitude = `${speed.toFixed(3)} km/s`;
    }

    return [
      { name: 'Satellite Number', value: satrec.satnum?.toString() ?? 'N/A' },
      { name: 'Inclination (deg)', value: satrec.inclo ? (satrec.inclo * (180 / Math.PI)).toFixed(2) : 'N/A' },
      { name: 'RAAN (deg)', value: satrec.nodeo ? (satrec.nodeo * (180 / Math.PI)).toFixed(2) : 'N/A' },
      { name: 'Eccentricity', value: satrec.ecco?.toString() ?? 'N/A' },
      { name: 'Argument of Perigee (deg)', value: satrec.argpo ? (satrec.argpo * (180 / Math.PI)).toFixed(2) : 'N/A' },
      { name: 'Mean Anomaly (deg)', value: satrec.mo ? (satrec.mo * (180 / Math.PI)).toFixed(2) : 'N/A' },
      { name: 'Mean Motion (rev/day)', value: satrec.no_kozai ? (satrec.no_kozai * (1440 / (2 * Math.PI))).toFixed(2) : 'N/A' },
      { name: 'BSTAR Drag Term', value: satrec.bstar?.toString() ?? 'N/A' },
      { name: 'Velocity (km/s)', value: velocityMagnitude }
    ];
  }

  private buildLocationData(positionVector: EciVec3<number> | undefined, observationDate: Date): NamedValue[] {
    if (!positionVector) {
      return [
        { name: 'Latitude', value: 'N/A' },
        { name: 'Longitude', value: 'N/A' },
        { name: 'Altitude', value: 'N/A' }
      ];
    }

    const gmst = satellite.gstime(observationDate);
    const geodetic = satellite.eciToGeodetic(positionVector, gmst);
    const latitude = `${satellite.degreesLat(geodetic.latitude).toFixed(2)}°`;
    const longitude = `${satellite.degreesLong(geodetic.longitude).toFixed(2)}°`;
    const altitude = `${geodetic.height.toFixed(2)} km`;

    return [
      { name: 'Latitude', value: latitude },
      { name: 'Longitude', value: longitude },
      { name: 'Altitude', value: altitude }
    ];
  }

  private buildTleDataFromSatrec(satrec: any, tle: string[]): NamedValue[] {
    const tleString = tle.join('\n');
    return [
      { name: 'Epoch', value: satrec.epochdays?.toString() ?? 'N/A' },
      { name: 'TLE', value: tleString }
    ];
  }
}
