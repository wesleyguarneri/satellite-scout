import { Component, ElementRef, Input, OnChanges, OnDestroy, SimpleChanges, ViewChild } from '@angular/core';
import { AccordionModule } from 'primeng/accordion';
import { TableModule } from 'primeng/table';
import { TextareaModule } from 'primeng/textarea';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { NamedValue } from '../../models/named-value';
import { TleDetails } from '../../models/tle-details';
import * as satellite from 'satellite.js';
import type { PositionAndVelocity, EciVec3 } from 'satellite.js';
import {
  Chart,
  ChartConfiguration,
  ChartOptions,
  TooltipItem,
  registerables
} from 'chart.js';

Chart.register(...registerables);

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
  @ViewChild('velocityChart') velocityChartRef?: ElementRef<HTMLCanvasElement>;
  private velocityChart: Chart<'line'> | null = null;
  private velocityLabels: string[] = [];
  private velocityValues: (number | null)[] = [];

  ngOnChanges(_changes: SimpleChanges): void {
    if (this.satrec && this.tle) {
      this.tleData = this.buildTleDataFromSatrec(this.satrec, [this.tle.name, this.tle.line1, this.tle.line2]);
      this.refreshDynamicData();
      this.ensureLocationInterval();
      if (this.activeTab === 'charts') {
        this.scheduleChartRender();
      }
    } else {
      this.clearLocationInterval();
      this.resetVelocityVisuals();
    }
  }

  ngOnDestroy(): void {
    this.clearLocationInterval();
    this.destroyVelocityChart();
  }

  setActiveTab(tab: 'info' | 'charts') {
    this.activeTab = tab;
    if (tab === 'charts') {
      this.scheduleChartRender();
    }
  }

  private refreshDynamicData(): void {
    if (!this.satrec) return;

    const now = new Date();
    const propagated = satellite.propagate(this.satrec, now);
    const position = propagated?.position;
    const velocity = propagated?.velocity;

    this.orbitData = this.buildOrbitDataFromSatrec(this.satrec, velocity);
    this.locationData = this.buildLocationData(position, now);
    this.updateVelocitySeries(now);
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

  private scheduleChartRender(): void {
    if (!this.velocityLabels.length) {
      this.updateVelocitySeries(new Date());
    }
    setTimeout(() => {
      if (!this.velocityChart && this.velocityChartRef) {
        this.renderVelocityChart();
      } else if (this.velocityChart) {
        this.velocityChart.update();
      }
    }, 0);
  }

  private renderVelocityChart(): void {
    if (!this.velocityChartRef) return;
    const context = this.velocityChartRef.nativeElement.getContext('2d');
    if (!context) return;

    this.destroyVelocityChart();

    const config: ChartConfiguration<'line'> = {
      type: 'line',
      data: {
        labels: this.velocityLabels,
        datasets: [
          {
            label: 'Velocity (km/h)',
            data: this.velocityValues,
            borderColor: '#f59e0b',
            backgroundColor: 'rgba(245, 158, 11, 0.15)',
            tension: 0.3,
            fill: true,
            pointRadius: 2
          }
        ]
      },
      options: this.getChartOptions()
    };

    this.velocityChart = new Chart(context, config);
  }

  private getChartOptions(): ChartOptions<'line'> {
    const options: ChartOptions<'line'> = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            color: '#f8fafc'
          }
        },
        tooltip: {
          callbacks: {
            label: (ctx: TooltipItem<'line'>) => {
              const value = ctx.parsed.y;
              return Number.isFinite(value) ? ` ${value.toFixed(2)} km/h` : ' N/A';
            }
          }
        }
      },
      scales: {
        x: {
          ticks: { color: '#cbd5f5' },
          grid: { color: 'rgba(148, 163, 184, 0.1)' }
        },
        y: {
          ticks: { color: '#cbd5f5' },
          grid: { color: 'rgba(148, 163, 184, 0.1)' },
          title: {
            display: true,
            text: 'Velocity (km/h)',
            color: '#f8fafc'
          }
        }
      }
    };
    return options;
  }

  private updateVelocitySeries(referenceTime: Date): void {
    if (!this.satrec) {
      this.velocityLabels = [];
      this.velocityValues = [];
      if (this.velocityChart) {
        this.velocityChart.data.labels = [];
        this.velocityChart.data.datasets[0].data = [];
        this.velocityChart.update();
      }
      return;
    }

    const labels: string[] = [];
    const values: (number | null)[] = [];
    const samples = 25;
    const hourMillis = 60 * 60 * 1000;

    for (let i = 0; i < samples; i++) {
      const sampleTime = new Date(referenceTime.getTime() + i * hourMillis);
      const propagated = satellite.propagate(this.satrec, sampleTime);
      const velocityVector = propagated?.velocity;
      labels.push(`${i}h`);
      if (velocityVector) {
        const kmPerHour = this.getVelocityMagnitude(velocityVector) * 3600;
        values.push(Number(kmPerHour.toFixed(2)));
      } else {
        values.push(null);
      }
    }

    this.velocityLabels = labels;
    this.velocityValues = values;

    if (this.velocityChart) {
      this.velocityChart.data.labels = labels;
      this.velocityChart.data.datasets[0].data = values;
      this.velocityChart.update();
    }
  }

  private getVelocityMagnitude(velocityVector: PositionAndVelocity['velocity']): number {
    return Math.sqrt(
      velocityVector.x ** 2 +
      velocityVector.y ** 2 +
      velocityVector.z ** 2
    );
  }

  private destroyVelocityChart(): void {
    if (this.velocityChart) {
      this.velocityChart.destroy();
      this.velocityChart = null;
    }
  }

  private resetVelocityVisuals(): void {
    this.velocityLabels = [];
    this.velocityValues = [];
    this.destroyVelocityChart();
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
