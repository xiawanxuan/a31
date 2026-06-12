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
      events: false
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
    this.eventMarker.createEventMarkers();

    this.sceneManager.onStarClick = (mansion) => this.onStarClick(mansion);
    this.sceneManager.onStarHover = (mansion) => this.onStarHover(mansion);
    this.eventMarker.onEventClick = (event) => this.onEventClick(event);

    this.setupControls();

    document.getElementById('loading').classList.add('hidden');

    console.log('星占分野系统初始化完成');
    this.startAnimationLoop();
  }

  createStars() {
    StarData.twentyEightMansions.forEach(mansion => {
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
  }

  onStarClick(mansion) {
    console.log(`点击了 ${mansion.name}`);
    this.fenyeSystem.highlightMansion(mansion.id);
    this.highlightTwelveDivision(mansion.twelve);

    const starInfo = document.getElementById('star-info');
    if (starInfo) {
      const starName = starInfo.querySelector('.star-name');
      const starDetail = starInfo.querySelector('.star-detail');
      if (starName && starDetail) {
        starName.textContent = mansion.fullName;
        starDetail.innerHTML = `
          <strong>星座：</strong>${mansion.constellation}<br>
          <strong>赤经：</strong>${mansion.ra.toFixed(1)}°<br>
          <strong>赤纬：</strong>${mansion.dec.toFixed(1)}°<br>
          <strong>视星等：</strong>${mansion.magnitude}<br>
          <strong>分野：</strong>${mansion.fenye}（${mansion.state}国）<br>
          <strong>十二次：</strong>${mansion.twelve}<br><br>
          ${mansion.description}
        `;
      }
    }
  }

  onStarHover(mansion) {
    this.fenyeSystem.highlightMansion(mansion.id);
    this.highlightTwelveDivision(mansion.twelve);
  }

  highlightTwelveDivision(twelveName) {
    this.twelveDivisions.resetHighlights();
    const division = StarData.twelveDivisions.find(d => d.name === twelveName);
    if (division) {
      this.twelveDivisions.highlightDivision(division.id);
    }
  }

  onEventClick(event) {
    console.log(`点击了事件：${event.name}`);
    if (event.star) {
      this.fenyeSystem.highlightMansion(event.star);
      const mansion = StarData.twentyEightMansions.find(m => m.id === event.star);
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

    document.querySelectorAll('[data-clip]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('[data-clip]').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        const clip = e.target.dataset.clip;
        this.sceneManager.toggleClipping(clip === 'on');
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

  startAnimationLoop() {
    const animate = (time) => {
      requestAnimationFrame(animate);
      if (this.eventMarker && this.visibleLayers.events) {
        this.eventMarker.animateEvents(time);
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
