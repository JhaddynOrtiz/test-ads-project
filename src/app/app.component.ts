import { Component, OnInit, OnDestroy, ChangeDetectorRef, Inject, PLATFORM_ID, ViewChild, ElementRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import * as L from 'leaflet';

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
  styleUrls: ['./app.component.scss'], // Cambiado a styleUrls por consistencia
  standalone: true
})
export class AppComponent implements OnInit, OnDestroy {
  constructor(
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: Object
  ) { }

  title = 'test-ads';
  adsResult: AdsResult | null = null; // Tipado más específico
  private map: L.Map | undefined; // Tipado explícito para L.Map
  private marker: L.Marker | undefined; // Tipado explícito para L.Marker

  // Referencia al div del mapa en la plantilla usando @ViewChild
  @ViewChild('mapContainer') mapContainer!: ElementRef;

  public get hasValidCoordinates(): boolean {
    const lat = this.adsResult?.data?.latitude;
    const lon = this.adsResult?.data?.longitude;
    return lat != null && lon != null;
  }

  private adsDataListener = (event: Event) => {
    const customEvent = event as CustomEvent;
    this.adsResult = customEvent.detail;

    // Forzamos a Angular a reconocer el cambio
    this.cdr.detectChanges();

    // Esperamos un "tick" para que el [hidden] o la vista se actualicen
    setTimeout(() => {
      this.updateMap();
    }, 0);
  };

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      window.addEventListener('adsDataCaptured', this.adsDataListener);
    }
  }

  ngOnDestroy(): void {
    if (isPlatformBrowser(this.platformId)) {
      // Limpiamos el listener y el mapa para prevenir fugas de memoria
      window.removeEventListener('adsDataCaptured', this.adsDataListener);
      if (this.map) {
        this.map.remove();
        this.map = undefined; // Resetear la referencia del mapa
        this.marker = undefined; // Resetear la referencia del marcador
      }
    }
  }

  private updateMap(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    // Asumo que los datos de ubicación están en `data.latitude` y `data.longitude`.
    // Ajusta si la ruta en tu JSON es diferente.
    const lat = this.adsResult?.data?.latitude;
    // Manejar tanto 'longitude' como 'longitud' para mayor robustez
    const lon = this.adsResult?.data?.longitude;

    console.log("Coordenadas recibidas:", lat, lon);
    if (this.hasValidCoordinates) {
      if (!this.map) { // Si el mapa no ha sido inicializado, lo inicializamos
        this.initMap(lat!, lon!); // Usamos el operador de aserción no nula
      } else { // Si ya existe, solo actualizamos la vista y el marcador
        this.updateExistingMap(lat!, lon!); // Usamos el operador de aserción no nula
      }
    } else {
      console.log("No se encontraron latitud o longitud válidas en adsResult.data. El mapa no se mostrará o se eliminará.");
      // Si los datos ya no están disponibles, eliminamos el mapa
      if (this.map) {
        this.map.remove();
        this.map = undefined;
        this.marker = undefined;
      }
    }
  }

  private initMap(lat: number, lon: number): void {
    if (!this.mapContainer?.nativeElement) return;

    try {
      // 2. Configura los iconos ANTES de crear el mapa
      // Esto evita el error "r.icon is not a function"
      const iconDefault = L.icon({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        tooltipAnchor: [16, -28],
        shadowSize: [41, 41]
      });

      // Asignamos el icono por defecto globalmente para Leaflet
      L.Marker.prototype.options.icon = iconDefault;

      // 3. Inicializa el mapa normalmente
      this.map = L.map(this.mapContainer.nativeElement).setView([lat, lon], 13);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap'
      }).addTo(this.map);

      this.marker = L.marker([lat, lon]).addTo(this.map)
        .bindPopup('Ubicación del data.')
        .openPopup();

    } catch (error) {
      console.error('Error al inicializar el mapa:', error);
    }
  }

  private async updateExistingMap(lat: number, lon: number): Promise<void> {
    if (!this.map) {
      console.error("Se intentó actualizar una instancia de mapa inexistente.");
      return;
    }
    console.log("Actualizando la posición del marcador en el mapa existente...");
    try {
      const L = await import('leaflet');
      const newLatLng = new L.LatLng(lat, lon);
      this.map.setView(newLatLng, 13);
      if (this.marker) {
        this.marker.setLatLng(newLatLng);
      } else {
        // Si el marcador desapareció por alguna razón, lo volvemos a añadir
        this.marker = L.marker(newLatLng).addTo(this.map)
          .bindPopup('Ubicación del data.')
          .openPopup();
      }
      console.log("Marcador del mapa existente actualizado exitosamente.");
    } catch (error) {
      console.error('Error al actualizar el mapa existente:', error);
    }
  }
}
