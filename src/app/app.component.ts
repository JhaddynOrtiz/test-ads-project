import { Component, OnInit, OnDestroy, ChangeDetectorRef, Inject, PLATFORM_ID, ViewChild, ElementRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import type * as L from 'leaflet'; // Importamos solo los tipos para evitar que el código de Leaflet se ejecute en el servidor

// Define interfaces para una mejor seguridad de tipos
interface AdsData {
  latitude?: number;
  longitude?: number;
  longitud?: number; // Manejar posible error tipográfico
}

interface AdsResult {
  data?: AdsData;
  // Añadir otras propiedades de adsResult si se conocen
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
  ) {}

  title = 'test-ads';
  adsResult: AdsResult | null = null; // Tipado más específico
  private map: L.Map | undefined; // Tipado explícito para L.Map
  private marker: L.Marker | undefined; // Tipado explícito para L.Marker

  // Referencia al div del mapa en la plantilla usando @ViewChild
  @ViewChild('mapContainer') mapContainer!: ElementRef;

  public get hasValidCoordinates(): boolean {
    const lat = this.adsResult?.data?.latitude;
    const lon = this.adsResult?.data?.longitude ?? this.adsResult?.data?.longitud;
    return lat != null && lon != null;
  }

  private adsDataListener = (event: Event) => {
    const customEvent = event as CustomEvent;
    this.adsResult = customEvent.detail;
    // Como el evento viene de `window`, está fuera de la zona de Angular.
    // Necesitamos disparar manualmente la detección de cambios para actualizar la vista.
    this.cdr.detectChanges();
    // Usamos Promise.resolve().then para asegurar que el DOM se haya actualizado
    // después de la detección de cambios de Angular, antes de interactuar con el elemento #map.
    Promise.resolve().then(() => {
      this.updateMap();
    });
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
    const lon = this.adsResult?.data?.longitude ?? this.adsResult?.data?.longitud;

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

  private async initMap(lat: number, lon: number): Promise<void> {
    console.log("Inicializando nueva instancia de mapa...");
    // Verificamos que el contenedor del mapa exista en el DOM usando @ViewChild
    if (!this.mapContainer?.nativeElement) {
      console.error('Error: mapContainer no está disponible. Asegúrate de que el *ngIf haya renderizado el elemento.');
      return;
    }
    
    const L = await import('leaflet');
    try {
      // Asignamos la instancia del mapa a this.map
      this.map = L.map(this.mapContainer.nativeElement).setView([lat, lon], 13);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { 
        maxZoom: 19,
        attribution: '© <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      }).addTo(this.map);

      this.marker = L.marker([lat, lon]).addTo(this.map)
        .bindPopup('Ubicación del data.')
        .openPopup();
      console.log("Mapa inicializado exitosamente con marcador.");
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
