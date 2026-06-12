import { SceneManager } from './scene/SceneManager.js';
import { CoordinateSystem } from './coordinates/CoordinateSystem.js';
import { FenyeSystem } from './fenye/FenyeSystem.js';
import { EventMarker } from './events/EventMarker.js';
import { TwelveDivisions } from './scene/TwelveDivisions.js';
import { twentyEightMansions, twelveDivisions, constellationLineTopology } from './data/starData.js';

class StarFenyeApp {
  constructor() {
    this.sceneManager = null;
    this.coordinateSystem = null;
    this.fenyeSystem = null;
    this.eventMarker = null;
    this.twelveDivisions = null;
    this.visibleLayers = {
      stars: true,
      grid: true,
      twelve: false,
      events: false,
      constellation: false
    };

    this.init();
  }

  init() {
    this.sceneManager = new SceneManager('canvas-container');
    this.coordinateSystem = new CoordinateSystem(this.sceneManager);
    this.fenyeSystem = new FenyeSystem(this.sceneManager, 'fenye-map');
    this.eventMarker = new EventMarker(this.sceneManager, 'event-list');
    this.twelveDivisions = new TwelveDivisions(this.sceneManager);

    this.createStars();
    this.sceneManager.createFourSymbols();
    this.eventMarker.createEventMarkers();

    this.sceneManager.onStarClick = (mansion) => this.onStarClick(mansion);
    this.sceneManager.onStarHover = (mansion) => this.onStarHover(mansion);
    this.eventMarker.onEventClick = (event) => this.onEventClick(event);

    this.setupControls();

    document.getElementById('loading').classList.add('hidden');

    this.createCoordIndicator();

    console.log('星占分野系统初始化完成');
    this.startAnimationLoop();
  }

  createCoordIndicator() {
    const indicator = document.createElement('div');
    indicator.id = 'coord-indicator';
    indicator.style.cssText = `
      position: absolute;
      bottom: 15px;
      left: 30px;
      padding: 8px 16px;
      background: rgba(10, 10, 30, 0.8);
      border: 1px solid rgba(100, 150, 255, 0.4);
      border-radius: 6px;
      font-size: 12px;
      color: #8af;
      z-index: 10;
      pointer-events: none;
    `;
    indicator.textContent = '坐标系：赤道坐标系';
    document.getElementById('canvas-container').appendChild(indicator);
  }

  updateCoordIndicator() {
    const indicator = document.getElementById('coord-indicator');
    if (indicator) {
      const names = {
        equatorial: '赤道坐标系（赤经/赤纬）',
        ecliptic: '黄道坐标系（黄经/黄纬）',
        horizontal: '地平坐标系（方位角/高度角）'
      };
      indicator.textContent = `坐标系：${names[this.coordinateSystem.currentSystem] || '赤道'}`;
    }
  }

  createStars() {
    twentyEightMansions.forEach(mansion => {
      let color = 0xffffff;
      const mag = mansion.magnitude;
      if (mag < 1) {
        color = 0xfff0e0;
      } else if (mag < 2) {
        color = 0xfffff0;
      }

      const star = this.sceneManager.addStar(
        mansion.ra,
        mansion.dec,
        mansion.magnitude,
        color,
        { mansion: mansion }
      );

      this.sceneManager.addStarLabel(
        mansion.name,
        mansion.ra,
        mansion.dec,
        0x88aaff
      );
    });

    this.sceneManager.createConstellationLines(twentyEightMansions, constellationLineTopology);
  }

  onStarClick(mansion) {
    this.fenyeSystem.highlightMansion(mansion.id);
    this.highlightTwelveDivision(mansion.twelve);
    this.focusOnMansion(mansion);

    const starInfo = document.getElementById('star-info');
    if (starInfo) {
      const starName = starInfo.querySelector('.star-name');
      const starDetail = starInfo.querySelector('.star-detail');
      if (starName && starDetail) {
        const coord = this.coordinateSystem.convertStarPosition(mansion.ra, mansion.dec);
        let coordStr = '';
        if (coord.system === 'equatorial') {
          coordStr = `赤经：${coord.ra.toFixed(1)}° / 赤纬：${coord.dec.toFixed(1)}°`;
        } else if (coord.system === 'ecliptic') {
          coordStr = `黄经：${coord.lambda.toFixed(1)}° / 黄纬：${coord.beta.toFixed(1)}°`;
        } else if (coord.system === 'horizontal') {
          coordStr = `方位角：${coord.az.toFixed(1)}° / 高度角：${coord.alt.toFixed(1)}°`;
        }

        starName.textContent = mansion.fullName;
        starDetail.innerHTML = `
          <strong>星座：</strong>${mansion.constellation}<br>
          <strong>${coord.system === 'ecliptic' ? '黄道' : coord.system === 'horizontal' ? '地平' : '赤道'}坐标：</strong>${coordStr}<br>
          <strong>赤经：</strong>${mansion.ra.toFixed(1)}° / <strong>赤纬：</strong>${mansion.dec.toFixed(1)}°<br>
          <strong>视星等：</strong>${mansion.magnitude}<br>
          <strong>分野：</strong>${mansion.fenye}（${mansion.state}国）<br>
          <strong>十二次：</strong>${mansion.twelve}<br><br>
          ${mansion.description}
        `;
      }
    }

    const relatedEvents = this.eventMarker.getEventsByMansion(mansion.id);
    if (relatedEvents.length > 0) {
      const eventDetail = document.getElementById('event-detail');
      const eventName = document.getElementById('event-name');
      const eventDesc = document.getElementById('event-desc');
      if (eventDetail && eventName && eventDesc) {
        eventDetail.classList.remove('hidden');
        eventName.textContent = `相关星占事件（${relatedEvents.length}）`;
        eventDesc.innerHTML = relatedEvents.map(e =>
          `<span style="color:#faa;">●</span> <strong>${e.name}</strong>（${e.date}）${e.significance}`
        ).join('<br>');
      }
    }
  }

  onStarHover(mansion) {
    this.fenyeSystem.highlightMansion(mansion.id);
    this.highlightTwelveDivision(mansion.twelve);
  }

  highlightTwelveDivision(twelveName) {
    this.twelveDivisions.resetHighlights();
    const division = twelveDivisions.find(d => d.name === twelveName);
    if (division) {
      this.twelveDivisions.highlightDivision(division.id);
    }
  }

  onEventClick(event) {
    if (event.star) {
      this.fenyeSystem.highlightMansion(event.star);
      const mansion = twentyEightMansions.find(m => m.id === event.star);
      if (mansion) {
        const starInfo = document.getElementById('star-info');
        if (starInfo) {
          const starName = starInfo.querySelector('.star-name');
          const starDetail = starInfo.querySelector('.star-detail');
          if (starName && starDetail) {
            starName.textContent = event.name;
            starDetail.innerHTML = `
              <strong>时间：</strong>${event.date}（${event.dynasty}）<br>
              <strong>星宿：</strong>${mansion.fullName}<br>
              <strong>分野：</strong>${mansion.fenye}（${mansion.state}国）<br>
              <strong>十二次：</strong>${mansion.twelve}<br><br>
              <strong>描述：</strong>${event.description}<br><br>
              <strong>星占意义：</strong>${event.significance}<br>
              <strong>史料记载：</strong>${event.historicalRecord}
            `;
          }
        }
      }
    }
  }

  setupControls() {
    document.querySelectorAll('[data-coord]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('[data-coord]').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        const coord = e.target.dataset.coord;
        this.coordinateSystem.setSystem(coord);
        this.updateCoordIndicator();
      });
    });

    document.querySelectorAll('[data-layer]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const layer = e.target.dataset.layer;
        this.visibleLayers[layer] = !this.visibleLayers[layer];
        e.target.classList.toggle('active', this.visibleLayers[layer]);

        switch (layer) {
          case 'stars':
            this.sceneManager.toggleLayer('stars', this.visibleLayers.stars);
            break;
          case 'constellation':
            this.sceneManager.toggleLayer('constellation', this.visibleLayers.constellation);
            break;
          case 'grid':
            this.sceneManager.toggleLayer('grid', this.visibleLayers.grid);
            break;
          case 'twelve':
            this.sceneManager.toggleLayer('twelve', this.visibleLayers.twelve);
            break;
          case 'events':
            this.sceneManager.toggleLayer('events', this.visibleLayers.events);
            break;
        }
      });
    });

    this.sceneManager.toggleLayer('twelve', false);
    this.sceneManager.toggleLayer('events', false);
    this.sceneManager.toggleLayer('constellation', false);

    document.querySelectorAll('[data-clip]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('[data-clip]').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        const clip = e.target.dataset.clip;
        this.sceneManager.toggleClipping(clip === 'on');
      });
    });

    document.querySelectorAll('[data-clip-plane]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('[data-clip-plane]').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        const planeType = e.target.dataset['clip-plane'];
        if (planeType !== 'custom') {
          this.sceneManager.currentCoordSystem = planeType;
          this.sceneManager.updateClippingPlane(planeType);
          const clipDepthSlider = document.getElementById('clip-depth');
          const clipRotateSlider = document.getElementById('clip-rotate');
          if (clipDepthSlider) clipDepthSlider.value = 0;
          if (clipRotateSlider) clipRotateSlider.value = 0;
        }
      });
    });

    document.querySelectorAll('[data-clip-side]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('[data-clip-side]').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        const side = e.target.dataset['clip-side'];
        this.sceneManager.clippingPlane.normal.negate();
        if (this.sceneManager.clippingPlaneMesh) {
          this.sceneManager.clippingPlaneMesh.lookAt(
            this.sceneManager.clippingPlane.normal.clone().multiplyScalar(100)
          );
        }
      });
    });

    const clipDepthSlider = document.getElementById('clip-depth');
    if (clipDepthSlider) {
      clipDepthSlider.addEventListener('input', (e) => {
        const depth = parseFloat(e.target.value);
        this.sceneManager.clippingPlane.constant = depth;
        if (this.sceneManager.clippingPlaneMesh) {
          const normal = this.sceneManager.clippingPlane.normal.clone();
          this.sceneManager.clippingPlaneMesh.position.copy(normal.multiplyScalar(-depth));
        }
      });
    }

    const clipRotateSlider = document.getElementById('clip-rotate');
    if (clipRotateSlider) {
      clipRotateSlider.addEventListener('input', (e) => {
        const angle = parseFloat(e.target.value) * Math.PI / 180;
        const baseNormal = this.getBaseNormal(this.sceneManager.currentCoordSystem);
        const rotationAxis = new THREE.Vector3(0, 1, 0);
        const rotatedNormal = baseNormal.clone().applyAxisAngle(rotationAxis, angle);
        this.sceneManager.clippingPlane.normal.copy(rotatedNormal);
        if (this.sceneManager.clippingPlaneMesh) {
          this.sceneManager.clippingPlaneMesh.lookAt(rotatedNormal.clone().multiplyScalar(100));
        }
      });
    }

    document.querySelectorAll('[data-map]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('[data-map]').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        const mapType = e.target.dataset.map;
        this.fenyeSystem.setMapMode(mapType);
      });
    });
  }

  getBaseNormal(system) {
    const epsilon = 23.4397 * Math.PI / 180;
    switch (system) {
      case 'equatorial':
        return new THREE.Vector3(0, 0, 1);
      case 'ecliptic':
        return new THREE.Vector3(0, -Math.sin(epsilon), Math.cos(epsilon));
      case 'horizontal':
        return new THREE.Vector3(0, 1, 0);
      default:
        return new THREE.Vector3(0, 0, 1);
    }
  }

  focusOnMansion(mansion) {
    if (!mansion) return;
    
    const targetPos = this.coordinateSystem.getTargetPosition(
      mansion.ra, 
      mansion.dec, 
      this.coordinateSystem.currentSystem
    );
    
    const distance = this.sceneManager.camera.position.length();
    const targetCameraPos = targetPos.clone().normalize().multiplyScalar(distance * 1.3);
    
    this.animateCamera(targetCameraPos, 1000);
  }

  animateCamera(targetPosition, duration) {
    const startPosition = this.sceneManager.camera.position.clone();
    const startTime = performance.now();
    
    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const t = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      
      this.sceneManager.camera.position.lerpVectors(startPosition, targetPosition, eased);
      this.sceneManager.camera.lookAt(0, 0, 0);
      
      if (t < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }

  startAnimationLoop() {
    const animate = (time) => {
      requestAnimationFrame(animate);
      if (this.eventMarker && this.visibleLayers.events) {
        this.eventMarker.animateEvents(time);
      }
      if (this.coordinateSystem) {
        this.coordinateSystem.lst += 0.01;
        if (this.coordinateSystem.lst > 360) this.coordinateSystem.lst -= 360;
      }
    };
    animate(0);
  }

  static getInstance() {
    if (!StarFenyeApp.instance) {
      StarFenyeApp.instance = new StarFenyeApp();
    }
    return StarFenyeApp.instance;
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.starFenyeApp = StarFenyeApp.getInstance();
});

export { StarFenyeApp };
