import { Component, ElementRef, inject, NgZone, ViewChild } from '@angular/core';
import * as THREE from 'three'
import * as satellite from 'satellite.js'
import { SatelliteService } from '../../services/satellite.service';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CommonModule } from '@angular/common';
import { SatelliteDataPanelComponent } from '../satellite-data-panel/satellite-data-panel.component';
import { TleDetails } from '../../models/tle-details';

@Component({
  selector: 'app-globe',
  imports: [CommonModule, SatelliteDataPanelComponent],
  standalone: true,
  templateUrl: './globe.component.html',
  styleUrl: './globe.component.css'
})
export class GlobeComponent {
  @ViewChild('canvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>
  @ViewChild('container', { static: true }) containerRef!: ElementRef<HTMLDivElement>

  renderer!: THREE.WebGLRenderer;
  scene!: THREE.Scene;
  camera!: THREE.PerspectiveCamera;
  raycaster = new THREE.Raycaster();
  mouse = new THREE.Vector2();
  controls!: OrbitControls;
  earth!: THREE.Mesh;
  satelliteMesh!: THREE.Mesh;
  orbitLine: THREE.Line | null | undefined;
  frameId: number | null = null;
  startTime = Date.now();
  autoRotate = true;
  showData = false;

  // scale: 1 unit = earth radius (6371 km)
  KM_TO_UNITS = 1 / 6371;

  // orbit samples (seconds)
  orbitSamples: THREE.Vector3[] = [];
  satrec: any;
  tle: TleDetails = {
    name: '',
    line1: '',
    line2: ''
  };

  private ngZone = inject(NgZone);
  private satService = inject(SatelliteService);

  ngOnInit() {
    const [name, l1, l2] = this.satService.getExampleTLE()
    this.satrec = this.satService.tleToSatrec(l1, l2)
    this.tle = {
      name,
      line1: l1,
      line2: l2
    }
  }

  async ngAfterViewInit() {
    this.initThree()
    await this.createEarth()
    this.createSatelliteMarker()
    // this.sampleOrbit()
    this.startAnimationLoop()
    window.addEventListener('resize', this.onWindowResize)
  }

  ngOnDestroy() {
    if (this.frameId != null) cancelAnimationFrame(this.frameId)
    window.removeEventListener('resize', this.onWindowResize)
    this.renderer.dispose()
  }

  initThree() {
    const canvas = this.canvasRef.nativeElement
    this.scene = new THREE.Scene()
    this.camera = new THREE.PerspectiveCamera(45, this.containerRef.nativeElement.clientWidth / this.containerRef.nativeElement.clientHeight, 0.1, 1000)
    this.camera.position.set(0, 0, 3.2)

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
    this.renderer.setPixelRatio(window.devicePixelRatio)
    this.renderer.setSize(this.containerRef.nativeElement.clientWidth, this.containerRef.nativeElement.clientHeight)

    // lighting
    // const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 1)
    // hemi.position.set(0, 20, 0)
    // this.scene.add(hemi)
    // const dir = new THREE.DirectionalLight(0xffffff, 0.6)
    // dir.position.set(5, 3, 5)
    // this.scene.add(dir)
    const amb = new THREE.AmbientLight(0xffffff)
    this.scene.add(amb)

    // controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.minDistance = 1.2
    this.controls.maxDistance = 10

    this.renderer.domElement.addEventListener('pointerdown', this.onPointerDown.bind(this));
  }

  async createEarth() {
    // Use a texture hosted on threejs examples (or swap with your own)
    const loader = new THREE.TextureLoader()
    const earthMap = await loader.loadAsync('/img/earth.png')
    const bumpMap = await loader.loadAsync('/img/bump.png')
    // const specMap = await loader.loadAsync('https://threejs.org/examples/textures/earthspec1k.jpg')

    const geometry = new THREE.SphereGeometry(1, 64, 64)
    const material = new THREE.MeshStandardMaterial({
      map: earthMap,
      bumpMap: bumpMap,
      bumpScale: 0.05,
      //specularMap: specMap,
      //specular: new THREE.Color('grey')
    })
    this.earth = new THREE.Mesh(geometry, material)
    this.scene.add(this.earth)

    // optional atmosphere (simple)
    const atmosphereGeo = new THREE.SphereGeometry(1.02, 64, 64)
    const atmosphereMat = new THREE.MeshBasicMaterial({
      color: 0x88ccff,
      transparent: true,
      opacity: 0.08,
      side: THREE.BackSide
    })
    const atmosphere = new THREE.Mesh(atmosphereGeo, atmosphereMat)
    this.scene.add(atmosphere)
  }

createSatelliteMarker() {
  const satGeo = new THREE.CircleGeometry(0.01, 32)
  const satMat = new THREE.MeshBasicMaterial({
    color: 0xffaa00 // bright yellow, always constant brightness
  })
  this.satelliteMesh = new THREE.Mesh(satGeo, satMat)
  this.scene.add(this.satelliteMesh)
}

  /**
   * Sample the orbit for a window of time (here ±45 minutes) and create a line
   * We propagate the satellite at multiple times and place points.
   *
   * IMPORTANT NOTE: satellite.js propagate returns TEME (inertial) coordinates.
   * Drawing the full orbit in a rotating Earth frame requires converting to
   * ECF, or drawing in ECI and rotating Earth accordingly. For simplicity here
   * we convert to ECF (earth-fixed) using satellite.eciToEcf at each sample time.
   *
   */
  sampleOrbit(start: Date) {
    const samples = 200
    const windowSeconds = 90 * 60 // 90 minutes
    const end = new Date(start.getTime() + windowSeconds * 1000)
    this.orbitSamples = []

    for (let i = 0; i <= samples; i++) {
      const t = new Date(start.getTime() + (i / samples) * (end.getTime() - start.getTime()))
      const prop = satellite.propagate(this.satrec, t)
      if (!prop?.position) continue
      const gmst = satellite.gstime(t)
      const ecf = satellite.eciToEcf(prop.position, gmst)
      const vx = ecf.x * this.KM_TO_UNITS
      const vy = ecf.y * this.KM_TO_UNITS
      const vz = ecf.z * this.KM_TO_UNITS
      this.orbitSamples.push(new THREE.Vector3(vx, vz, -vy))
    }

    const lineGeom = new THREE.BufferGeometry().setFromPoints(this.orbitSamples)
    const lineMat = new THREE.LineBasicMaterial({ color: 0x00ffdd })
    if (this.orbitLine) this.scene.remove(this.orbitLine)
    this.orbitLine = new THREE.Line(lineGeom, lineMat)
    this.scene.add(this.orbitLine)
  }

  updateSatellitePosition(time: Date) {
    const prop = satellite.propagate(this.satrec, time)
    if (!prop?.position) return
    const gmst = satellite.gstime(time)
    const ecf = satellite.eciToEcf(prop?.position, gmst)
    const x = ecf.x * this.KM_TO_UNITS
    const y = ecf.y * this.KM_TO_UNITS
    const z = ecf.z * this.KM_TO_UNITS
    // align axes: small tweak to match Three's Y-up
    this.satelliteMesh.position.set(x, z, -y)
  }

  startAnimationLoop() {
    this.ngZone.runOutsideAngular(() => {  
      const animate = () => {
        if (this.autoRotate) this.earth.rotation.y += 0.0001

        const elapsed = (Date.now() - this.startTime) / 1000

        const speedFactor = 10 
        const t = new Date(Date.now() + elapsed * 1000 * (speedFactor - 1))
        this.updateSatellitePosition(t)

        this.satelliteMesh.lookAt(this.camera.position);
        this.controls.update()
        this.renderer.render(this.scene, this.camera)
        this.frameId = requestAnimationFrame(animate)
      }
      animate()
    })
  }

  toggleAutoRotate() {
    this.autoRotate = !this.autoRotate
  }

  onWindowResize = () => {
    const width = this.containerRef.nativeElement.clientWidth
    const height = this.containerRef.nativeElement.clientHeight
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(width, height)
  }

  onPointerDown(event: PointerEvent) {
    this.mouse.x = (event.clientX / this.containerRef.nativeElement.clientWidth) * 2 - 1
    this.mouse.y = -(event.clientY / this.containerRef.nativeElement.clientHeight) * 2 + 1

    this.raycaster.setFromCamera(this.mouse, this.camera)
    const intersects = this.raycaster.intersectObjects(this.scene.children)

    for (let i = 0; i < intersects.length; i++) {
      if (intersects[i].object === this.satelliteMesh) {
        this.showData = !this.showData

        if (this.orbitLine && this.orbitLine.visible) {
          this.orbitLine.visible = !this.orbitLine.visible
        } else {
          const elapsed = (Date.now() - this.startTime) / 1000
          const speedFactor = 10
          const t = new Date(Date.now() + elapsed * 1000 * (speedFactor - 1))

          this.updateSatellitePosition(t)
          this.sampleOrbit(t)
        }
        break
      }
    }
  }

}
