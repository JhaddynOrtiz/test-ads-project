import { Component, OnInit, OnDestroy, ChangeDetectorRef, Inject, PLATFORM_ID, ViewChild, ElementRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';

// ELIMINA cualquier import de Leaflet al principio del archivo. 
// No uses: import * as L from 'leaflet'; ni import { Map } from 'leaflet';

interface AdsData {
  latitude?: number;
  longitude?: number;
}

interface AdsResult {
  data?: AdsData;
}

@Component({
  selector: 'app-root',
  imports: [CommonModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  standalone: true
})
export class AppComponent implements OnInit, OnDestroy {
  constructor(
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: Object
  ) { }

  adsResult: AdsResult | null = null;
  private map: any; // Usamos any para evitar errores de tipo sin el import global
  private marker: any;

  @ViewChild('mapContainer') mapContainer!: ElementRef;

  public get hasValidCoordinates(): boolean {
    const lat = this.adsResult?.data?.latitude;
    const lon = this.adsResult?.data?.longitude;
    return lat != null && lon != null;
  }

  private adsDataListener = (event: Event) => {
    const customEvent = event as CustomEvent;
    this.adsResult = customEvent.detail;
    this.cdr.detectChanges();

    // Solo intentamos actualizar si estamos en el navegador
    if (isPlatformBrowser(this.platformId)) {
      setTimeout(() => { this.updateMap(); }, 0);
    }
  };

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      window.addEventListener('adsDataCaptured', this.adsDataListener);
    }
  }

  ngOnDestroy(): void {
    if (isPlatformBrowser(this.platformId)) {
      window.removeEventListener('adsDataCaptured', this.adsDataListener);
      if (this.map) {
        this.map.remove();
      }
    }
  }

  private async updateMap(): Promise<void> {
    if (!isPlatformBrowser(this.platformId) || !this.hasValidCoordinates) return;

    const lat = this.adsResult!.data!.latitude!;
    const lon = this.adsResult!.data!.longitude!;

    if (!this.map) {
      await this.initMap(lat, lon);
    } else {
      this.updateExistingMap(lat, lon);
    }
  }

  private async initMap(lat: number, lon: number): Promise<void> {
    if (!this.mapContainer?.nativeElement) return;

    try {
      // 1. Importamos el módulo
      const leafletModule = await import('leaflet');
      // 2. Extraemos el objeto real (compatible con local y producción)
      const L = leafletModule.default || leafletModule;

      this.map = L.map(this.mapContainer.nativeElement).setView([lat, lon], 13);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap'
      }).addTo(this.map);

      const myIcon = L.icon({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
      });

      this.marker = L.marker([lat, lon], { icon: myIcon }).addTo(this.map)
        .bindPopup('Ubicación capturada')
        .openPopup();

      console.log("Mapa cargado correctamente en producción.");
    } catch (error) {
      console.error('Error crítico en Leaflet:', error);
    }
  }

  private async updateExistingMap(lat: number, lon: number): Promise<void> {
    if (!this.map) return;
    
    try {
      // Aplicamos la misma corrección aquí
      const leafletModule = await import('leaflet');
      const L = leafletModule.default || leafletModule;
      
      const newLatLng = new L.LatLng(lat, lon);
      this.map.setView(newLatLng, 13);
      if (this.marker) this.marker.setLatLng(newLatLng);
    } catch (error) {
      console.error('Error al actualizar Leaflet:', error);
    }
  }

}