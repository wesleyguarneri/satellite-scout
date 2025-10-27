import { Component } from '@angular/core';
import { GlobeComponent } from './components/globe/globe.component';

@Component({
    selector: 'app-root',
    imports: [GlobeComponent],
    templateUrl: './app.component.html',
    styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'satellite-scout';
}
