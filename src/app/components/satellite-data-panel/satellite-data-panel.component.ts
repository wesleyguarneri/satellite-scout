import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { PanelModule } from 'primeng/panel';
import { AccordionModule } from 'primeng/accordion';
import { TableModule } from 'primeng/table';
import { TextareaModule } from 'primeng/textarea';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { NamedValue } from '../../models/named-value';
import { TleDetails } from '../../models/tle-details';

@Component({
  selector: 'app-satellite-data-panel',
  standalone: true,
  imports: [CommonModule, PanelModule, AccordionModule, TableModule, TextareaModule, FormsModule],
  templateUrl: './satellite-data-panel.component.html',
  styleUrls: ['./satellite-data-panel.component.css']
})
export class SatelliteDataPanelComponent implements OnChanges {
  @Input({ required: true }) tle!: TleDetails;
  @Input({ required: true }) satrec!: any;

  infoData: NamedValue[] = [
    { name: 'latitude', value: '24.58136' },
    { name: 'longitude', value: '-126.20389' },
    { name: 'internalTemperature', value: '20C' },
    { name: 'accelerometer', value: 'x 30, y 20, z 30' },
    { name: 'barometricPressure', value: '0' }
  ];
  orbitData: NamedValue[] = [];
  tleData: NamedValue[] = [];
  otherData: NamedValue[] = [{ name: 'example', value: 'Other data goes here' }];

  ngOnChanges(_changes: SimpleChanges): void {
    if (this.satrec && this.tle) {
      this.orbitData = this.buildOrbitDataFromSatrec(this.satrec);
      this.tleData = this.buildTleDataFromSatrec(this.satrec, [this.tle.name, this.tle.line1, this.tle.line2]);
    }
  }

  private buildOrbitDataFromSatrec(satrec: any): NamedValue[] {
    return [
      { name: 'Satellite Number', value: satrec.satnum?.toString() ?? 'N/A' },
      { name: 'Inclination (deg)', value: satrec.inclo ? (satrec.inclo * (180 / Math.PI)).toFixed(2) : 'N/A' },
      { name: 'RAAN (deg)', value: satrec.nodeo ? (satrec.nodeo * (180 / Math.PI)).toFixed(2) : 'N/A' },
      { name: 'Eccentricity', value: satrec.ecco?.toString() ?? 'N/A' },
      { name: 'Argument of Perigee (deg)', value: satrec.argpo ? (satrec.argpo * (180 / Math.PI)).toFixed(2) : 'N/A' },
      { name: 'Mean Anomaly (deg)', value: satrec.mo ? (satrec.mo * (180 / Math.PI)).toFixed(2) : 'N/A' },
      { name: 'Mean Motion (rev/day)', value: satrec.no_kozai ? (satrec.no_kozai * (1440 / (2 * Math.PI))).toFixed(2) : 'N/A' },
      { name: 'BSTAR Drag Term', value: satrec.bstar?.toString() ?? 'N/A' }
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
