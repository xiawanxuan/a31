window.SceneManager = (function() {
  class SceneManager {
    constructor(containerId) {
      this.container = document.getElementById(containerId);
      this.scene = null;
      this.camera = null;
      this.renderer = null;
      this.controls = null;
      this.starGroup = null;
      this.gridEquatorialGroup = null;
      this.gridEclipticGroup = null;
      this.gridHorizontalGroup = null;
      this.twelveGroup = null;
      this.eventGroup = null;
      this.sphereGroup = null;
      this.sphereRadius = 100;
      this.rotationSpeed = 0.0002;
      this.autoRotate = true;
      this.raycaster = new THREE.Raycaster();
      this.mouse = new THREE.Vector2();
      this.starClickables = [];
      this.eventClickables = [];
      this.onStarClick = null;
      this.onStarHover = null;
      this.onEventClick = null;
      this.currentCoordSystem = 'equatorial';
      this.lst = 0;
      this.lat = 35;
      this.targetSphereRotation = new THREE.Euler(0, 0, 0);
      this.currentSphereRotation = new THREE.Euler(0, 0, 0);
      this.clippingPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
      this.clippingEnabled = true;
      this.clippingPlaneMesh = null;

      this.init();
    }

    init() {
      this.scene = new THREE.Scene();
      this.scene.background = new THREE.Color(0x050510);

      const width = this.container.clientWidth;
      const height = this.container.clientHeight;

      this.camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
      this.camera.position.set(0, 40, 180);
      this.camera.lookAt(0, 0, 0);

      this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      this.renderer.setSize(width, height);
      this.renderer.setPixelRatio(window.devicePixelRatio);
      this.renderer.localClippingEnabled = true;
      this.container.appendChild(this.renderer.domElement);

      this.celestialSphereGroup = new THREE.Group();
      this.scene.add(this.celestialSphereGroup);

      this.starGroup = new THREE.Group();
      this.celestialSphereGroup.add(this.starGroup);

      this.gridEquatorialGroup = new THREE.Group();
      this.celestialSphereGroup.add(this.gridEquatorialGroup);

      this.gridEclipticGroup = new THREE.Group();
      this.celestialSphereGroup.add(this.gridEclipticGroup);
      this.gridEclipticGroup.visible = false;

      this.gridHorizontalGroup = new THREE.Group();
      this.celestialSphereGroup.add(this.gridHorizontalGroup);
      this.gridHorizontalGroup.visible = false;

      this.twelveGroup = new THREE.Group();
      this.celestialSphereGroup.add(this.twelveGroup);

      this.eventGroup = new THREE.Group();
      this.celestialSphereGroup.add(this.eventGroup);

      this.sphereGroup = new THREE.Group();
      this.celestialSphereGroup.add(this.sphereGroup);

      this.createCelestialSphere();
      this.createEquatorialGrid();
      this.createEclipticGrid();
      this.createHorizontalGrid();
      this.createBackgroundStars();
      this.addLights();
      this.setupControls();
      this.setupEvents();

      this.animate();

      window.addEventListener('resize', () => this.onWindowResize());
    }

    createCelestialSphere() {
      const geometry = new THREE.SphereGeometry(this.sphereRadius, 64, 64);
      const material = new THREE.MeshBasicMaterial({
        color: 0x0a0a20,
        wireframe: false,
        transparent: true,
        opacity: 0.3,
        side: THREE.BackSide,
        clippingPlanes: [this.clippingPlane],
        clipShadows: true
      });
      const sphere = new THREE.Mesh(geometry, material);
      sphere.name = 'celestialSphere';
      this.sphereGroup.add(sphere);

      const wireframeGeo = new THREE.SphereGeometry(this.sphereRadius + 0.5, 32, 32);
      const wireframeMat = new THREE.MeshBasicMaterial({
        color: 0x3355aa,
        wireframe: true,
        transparent: true,
        opacity: 0.2,
        clippingPlanes: [this.clippingPlane]
      });
      const wireframe = new THREE.Mesh(wireframeGeo, wireframeMat);
      wireframe.name = 'celestialWireframe';
      this.sphereGroup.add(wireframe);
      
      this.createClippingPlaneVisual();
    }

    createClippingPlaneVisual() {
      const planeSize = this.sphereRadius * 2.5;
      const planeGeometry = new THREE.PlaneGeometry(planeSize, planeSize, 32, 32);
      const planeMaterial = new THREE.MeshBasicMaterial({
        color: 0x4488ff,
        transparent: true,
        opacity: 0.15,
        side: THREE.DoubleSide,
        wireframe: false
      });
      this.clippingPlaneMesh = new THREE.Mesh(planeGeometry, planeMaterial);
      this.clippingPlaneMesh.visible = this.clippingEnabled;
      
      const wireframeGeo = new THREE.PlaneGeometry(planeSize, planeSize, 8, 8);
      const wireframeMat = new THREE.MeshBasicMaterial({
        color: 0x66aaff,
        transparent: true,
        opacity: 0.4,
        wireframe: true,
        side: THREE.DoubleSide
      });
      const wireframe = new THREE.Mesh(wireframeGeo, wireframeMat);
      this.clippingPlaneMesh.add(wireframe);
      
      const arrowHelper = new THREE.ArrowHelper(
        new THREE.Vector3(0, 0, 1),
        new THREE.Vector3(0, 0, 0),
        15,
        0x66ff88,
        5,
        2.5
      );
      this.clippingPlaneMesh.add(arrowHelper);
      
      this.sphereGroup.add(this.clippingPlaneMesh);
      this.updateClippingPlane(this.currentCoordSystem);
    }

    updateClippingPlane(system) {
      if (!this.clippingPlane || !this.clippingPlaneMesh) return;
      
      const epsilon = 23.4397 * Math.PI / 180;
      let normal = new THREE.Vector3(0, 0, 1);
      
      switch (system) {
        case 'equatorial':
          normal.set(0, 0, 1);
          break;
        case 'ecliptic':
          normal.set(0, -Math.sin(epsilon), Math.cos(epsilon));
          break;
        case 'horizontal':
          normal.set(0, 1, 0);
          break;
      }
      
      this.clippingPlane.normal.copy(normal);
      this.clippingPlane.constant = 0;
      
      this.clippingPlaneMesh.lookAt(normal.clone().multiplyScalar(100));
      this.applyClippingToScene();
    }

    applyClippingToScene() {
      const applyClipping = (object) => {
        if (object.material && !object.userData.noClipping) {
          if (Array.isArray(object.material)) {
            object.material.forEach(mat => {
              mat.clippingPlanes = [this.clippingPlane];
              mat.clipShadows = true;
            });
          } else {
            object.material.clippingPlanes = [this.clippingPlane];
            object.material.clipShadows = true;
          }
        }
        if (object.children) {
          object.children.forEach(child => applyClipping(child));
        }
      };
      
      this.celestialSphereGroup.children.forEach(group => {
        group.children.forEach(child => applyClipping(child));
      });
    }

    toggleClipping(enabled) {
      this.clippingEnabled = enabled;
      if (this.clippingPlaneMesh) {
        this.clippingPlaneMesh.visible = enabled;
      }
      this.renderer.localClippingEnabled = enabled;
    }

    createEquatorialGrid() {
      this.createEquatorLine();
      this.createEquatorialMeridians();
      this.createEquatorialParallels();
      this.addPoleMarker('N', 90, 0x6688cc);
      this.addPoleMarker('S', -90, 0x6688cc);
    }

    createEquatorLine() {
      const points = [];
      for (let i = 0; i <= 360; i += 2) {
        const rad = (i * Math.PI) / 180;
        points.push(new THREE.Vector3(
          this.sphereRadius * Math.cos(rad),
          0,
          this.sphereRadius * Math.sin(rad)
        ));
      }
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const material = new THREE.LineBasicMaterial({ color: 0xff6666, transparent: true, opacity: 0.8 });
      const line = new THREE.Line(geometry, material);
      line.name = 'equator';
      this.gridEquatorialGroup.add(line);

      this.addCircleLabel('赤道', 0, 0, 0xff6666);
    }

    createEquatorialMeridians() {
      for (let ra = 0; ra < 360; ra += 30) {
        const points = [];
        for (let dec = -90; dec <= 90; dec += 5) {
          const pos = StarData.raDecToVector3(ra, dec, this.sphereRadius);
          points.push(pos);
        }
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({
          color: ra % 90 === 0 ? 0x6688cc : 0x3355aa,
          transparent: true,
          opacity: ra % 90 === 0 ? 0.5 : 0.25
        });
        const line = new THREE.Line(geometry, material);
        line.name = 'meridian';
        this.gridEquatorialGroup.add(line);

        if (ra % 90 === 0) {
          this.addDegreeLabel(`${ra}°`, ra, 0, 0x88aaff);
        }
      }
    }

    createEquatorialParallels() {
      for (let dec = -60; dec <= 60; dec += 30) {
        const points = [];
        for (let ra = 0; ra <= 360; ra += 3) {
          const pos = StarData.raDecToVector3(ra, dec, this.sphereRadius);
          points.push(pos);
        }
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({
          color: dec === 0 ? 0xff6666 : 0x3355aa,
          transparent: true,
          opacity: dec === 0 ? 0.8 : 0.25
        });
        const line = new THREE.Line(geometry, material);
        line.name = 'parallel';
        this.gridEquatorialGroup.add(line);
      }
    }

    createEclipticGrid() {
      const epsilon = 23.4397;

      const eclipticPoints = [];
      for (let i = 0; i <= 360; i += 2) {
        const eq = StarData.eclipticToEquatorial(i, 0);
        const pos = StarData.raDecToVector3(eq.ra, eq.dec, this.sphereRadius);
        eclipticPoints.push(pos);
      }
      const eclipticGeo = new THREE.BufferGeometry().setFromPoints(eclipticPoints);
      const eclipticMat = new THREE.LineBasicMaterial({ color: 0xffcc00, transparent: true, opacity: 0.8 });
      const eclipticLine = new THREE.Line(eclipticGeo, eclipticMat);
      eclipticLine.name = 'ecliptic';
      this.gridEclipticGroup.add(eclipticLine);

      for (let lambda = 0; lambda < 360; lambda += 30) {
        const points = [];
        for (let beta = -90; beta <= 90; beta += 5) {
          const eq = StarData.eclipticToEquatorial(lambda, beta);
          const pos = StarData.raDecToVector3(eq.ra, eq.dec, this.sphereRadius);
          points.push(pos);
        }
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({
          color: lambda % 90 === 0 ? 0xffcc66 : 0xcc9933,
          transparent: true,
          opacity: lambda % 90 === 0 ? 0.5 : 0.25
        });
        const line = new THREE.Line(geometry, material);
        this.gridEclipticGroup.add(line);
      }

      for (let beta = -60; beta <= 60; beta += 30) {
        const points = [];
        for (let lambda = 0; lambda <= 360; lambda += 3) {
          const eq = StarData.eclipticToEquatorial(lambda, beta);
          const pos = StarData.raDecToVector3(eq.ra, eq.dec, this.sphereRadius);
          points.push(pos);
        }
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({
          color: beta === 0 ? 0xffcc00 : 0xcc9933,
          transparent: true,
          opacity: beta === 0 ? 0.8 : 0.25
        });
        const line = new THREE.Line(geometry, material);
        this.gridEclipticGroup.add(line);
      }

      const zodiacNames = ['白羊', '金牛', '双子', '巨蟹', '狮子', '室女', '天秤', '天蝎', '人马', '摩羯', '宝瓶', '双鱼'];
      zodiacNames.forEach((name, i) => {
        const lambda = i * 30 + 15;
        const eq = StarData.eclipticToEquatorial(lambda, 0);
        this.addZodiacLabel(name + '宫', eq.ra, eq.dec, 0xffcc66);
      });

      this.addPoleMarker('黄北极', 90, 0xffcc00, true);
      this.addPoleMarker('黄南极', -90, 0xffcc00, true);
    }

    createHorizontalGrid() {
      const horizonPoints = [];
      for (let i = 0; i <= 360; i += 2) {
        const rad = (i * Math.PI) / 180;
        horizonPoints.push(new THREE.Vector3(
          this.sphereRadius * Math.cos(rad),
          0,
          this.sphereRadius * Math.sin(rad)
        ));
      }
      const horizonGeo = new THREE.BufferGeometry().setFromPoints(horizonPoints);
      const horizonMat = new THREE.LineBasicMaterial({ color: 0x00ff88, transparent: true, opacity: 0.9 });
      const horizonLine = new THREE.Line(horizonGeo, horizonMat);
      horizonLine.name = 'horizon';
      this.gridHorizontalGroup.add(horizonLine);

      for (let az = 0; az < 360; az += 30) {
        const points = [];
        for (let alt = -90; alt <= 90; alt += 5) {
          const altRad = (alt * Math.PI) / 180;
          const azRad = (az * Math.PI) / 180;
          const r = this.sphereRadius * Math.cos(altRad);
          const x = r * Math.cos(azRad);
          const y = this.sphereRadius * Math.sin(altRad);
          const z = r * Math.sin(azRad);
          points.push(new THREE.Vector3(x, y, z));
        }
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({
          color: az % 90 === 0 ? 0x00ff88 : 0x00aa55,
          transparent: true,
          opacity: az % 90 === 0 ? 0.5 : 0.25
        });
        const line = new THREE.Line(geometry, material);
        this.gridHorizontalGroup.add(line);
      }

      for (let alt = -60; alt <= 60; alt += 30) {
        const points = [];
        for (let az = 0; az <= 360; az += 3) {
          const altRad = (alt * Math.PI) / 180;
          const azRad = (az * Math.PI) / 180;
          const r = this.sphereRadius * Math.cos(altRad);
          const x = r * Math.cos(azRad);
          const y = this.sphereRadius * Math.sin(altRad);
          const z = r * Math.sin(azRad);
          points.push(new THREE.Vector3(x, y, z));
        }
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({
          color: alt === 0 ? 0x00ff88 : 0x00aa55,
          transparent: true,
          opacity: alt === 0 ? 0.8 : 0.25
        });
        const line = new THREE.Line(geometry, material);
        this.gridHorizontalGroup.add(line);
      }

      this.addDirectionLabel('北', 0, 0, 0x00ff88);
      this.addDirectionLabel('东', 270, 0, 0x00ff88);
      this.addDirectionLabel('南', 180, 0, 0x00ff88);
      this.addDirectionLabel('西', 90, 0, 0x00ff88);
      this.addZenithNadirMarkers();
    }

    addPoleMarker(label, dec, color, isEcliptic = false) {
      const pos = StarData.raDecToVector3(0, dec, this.sphereRadius + 2);
      const group = isEcliptic ? this.gridEclipticGroup : this.gridEquatorialGroup;

      const geometry = new THREE.SphereGeometry(1.5, 16, 16);
      const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8 });
      const sphere = new THREE.Mesh(geometry, material);
      sphere.position.copy(pos);
      group.add(sphere);

      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.width = 128;
      canvas.height = 64;
      context.font = 'bold 20px SimHei, Microsoft YaHei, sans-serif';
      context.fillStyle = '#' + color.toString(16).padStart(6, '0');
      context.textAlign = 'center';
      context.fillText(label, 64, 35);

      const texture = new THREE.CanvasTexture(canvas);
      const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
      const sprite = new THREE.Sprite(spriteMat);
      sprite.position.copy(pos.clone().multiplyScalar(1.08));
      sprite.scale.set(8, 4, 1);
      group.add(sprite);
    }

    addCircleLabel(text, ra, dec, color) {
      const pos = StarData.raDecToVector3(ra, dec, this.sphereRadius + 3);
      pos.x = Math.abs(pos.x) < 0.1 ? (pos.x >= 0 ? 0.1 : -0.1) : pos.x;

      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.width = 256;
      canvas.height = 64;
      context.font = 'bold 24px SimHei, Microsoft YaHei, sans-serif';
      context.fillStyle = '#' + color.toString(16).padStart(6, '0');
      context.shadowColor = '#' + color.toString(16).padStart(6, '0');
      context.shadowBlur = 10;
      context.textAlign = 'center';
      context.fillText(text, 128, 40);

      const texture = new THREE.CanvasTexture(canvas);
      const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
      const sprite = new THREE.Sprite(spriteMat);
      sprite.position.copy(pos);
      sprite.scale.set(12, 3, 1);
      this.gridEquatorialGroup.add(sprite);
    }

    addDegreeLabel(text, ra, dec, color) {
      const pos = StarData.raDecToVector3(ra, dec, this.sphereRadius + 2);

      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.width = 128;
      canvas.height = 48;
      context.font = '16px SimHei, Microsoft YaHei, sans-serif';
      context.fillStyle = '#' + color.toString(16).padStart(6, '0');
      context.textAlign = 'center';
      context.fillText(text, 64, 28);

      const texture = new THREE.CanvasTexture(canvas);
      const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
      const sprite = new THREE.Sprite(spriteMat);
      sprite.position.copy(pos);
      sprite.scale.set(6, 2.2, 1);
      this.gridEquatorialGroup.add(sprite);
    }

    addZodiacLabel(text, ra, dec, color) {
      const pos = StarData.raDecToVector3(ra, dec, this.sphereRadius + 5);

      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.width = 256;
      canvas.height = 64;
      context.font = 'bold 22px SimHei, Microsoft YaHei, sans-serif';
      context.fillStyle = '#' + color.toString(16).padStart(6, '0');
      context.shadowColor = '#' + color.toString(16).padStart(6, '0');
      context.shadowBlur = 8;
      context.textAlign = 'center';
      context.fillText(text, 128, 38);

      const texture = new THREE.CanvasTexture(canvas);
      const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
      const sprite = new THREE.Sprite(spriteMat);
      sprite.position.copy(pos);
      sprite.scale.set(12, 3, 1);
      this.gridEclipticGroup.add(sprite);
    }

    addDirectionLabel(text, az, alt, color) {
      const azRad = (az * Math.PI) / 180;
      const altRad = (alt * Math.PI) / 180;
      const r = this.sphereRadius + 4;
      const x = r * Math.cos(altRad) * Math.cos(azRad);
      const y = r * Math.sin(altRad);
      const z = r * Math.cos(altRad) * Math.sin(azRad);

      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.width = 128;
      canvas.height = 64;
      context.font = 'bold 28px SimHei, Microsoft YaHei, sans-serif';
      context.fillStyle = '#' + color.toString(16).padStart(6, '0');
      context.shadowColor = '#' + color.toString(16).padStart(6, '0');
      context.shadowBlur = 10;
      context.textAlign = 'center';
      context.fillText(text, 64, 42);

      const texture = new THREE.CanvasTexture(canvas);
      const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
      const sprite = new THREE.Sprite(spriteMat);
      sprite.position.set(x, y, z);
      sprite.scale.set(6, 3, 1);
      this.gridHorizontalGroup.add(sprite);
    }

    addZenithNadirMarkers() {
      const zenith = new THREE.Vector3(0, this.sphereRadius + 2, 0);
      const nadir = new THREE.Vector3(0, -this.sphereRadius - 2, 0);

      const zenithGeo = new THREE.SphereGeometry(1.5, 16, 16);
      const zenithMat = new THREE.MeshBasicMaterial({ color: 0x00ff88, transparent: true, opacity: 0.8 });
      const zenithSphere = new THREE.Mesh(zenithGeo, zenithMat);
      zenithSphere.position.copy(zenith);
      this.gridHorizontalGroup.add(zenithSphere);

      const nadirGeo = new THREE.SphereGeometry(1.5, 16, 16);
      const nadirMat = new THREE.MeshBasicMaterial({ color: 0x008844, transparent: true, opacity: 0.6 });
      const nadirSphere = new THREE.Mesh(nadirGeo, nadirMat);
      nadirSphere.position.copy(nadir);
      this.gridHorizontalGroup.add(nadirSphere);

      this.addDirectionLabel('天顶', 0, 90, 0x00ff88);
    }

    createBackgroundStars() {
      const starsGeometry = new THREE.BufferGeometry();
      const starPositions = [];
      const starColors = [];
      const starSizes = [];

      for (let i = 0; i < 2000; i++) {
        const ra = Math.random() * 360;
        const dec = (Math.random() - 0.5) * 180;
        const pos = StarData.raDecToVector3(ra, dec, this.sphereRadius * 0.99);
        starPositions.push(pos.x, pos.y, pos.z);

        const magnitude = Math.random() * 5 + 1;
        const size = Math.max(0.3, 2 - magnitude * 0.3);
        starSizes.push(size);

        const colorChoice = Math.random();
        let color;
        if (colorChoice < 0.7) {
          color = new THREE.Color(0xffffff);
        } else if (colorChoice < 0.85) {
          color = new THREE.Color(0xfff0e0);
        } else {
          color = new THREE.Color(0xe0f0ff);
        }
        starColors.push(color.r, color.g, color.b);
      }

      starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3));
      starsGeometry.setAttribute('color', new THREE.Float32BufferAttribute(starColors, 3));
      starsGeometry.setAttribute('size', new THREE.Float32BufferAttribute(starSizes, 1));

      const starsMaterial = new THREE.PointsMaterial({
        size: 0.8,
        vertexColors: true,
        transparent: true,
        opacity: 0.9,
        sizeAttenuation: true
      });

      const stars = new THREE.Points(starsGeometry, starsMaterial);
      this.scene.add(stars);
    }

    addLights() {
      const ambientLight = new THREE.AmbientLight(0x404060, 0.5);
      this.scene.add(ambientLight);

      const pointLight = new THREE.PointLight(0xffffff, 1, 500);
      pointLight.position.set(100, 100, 100);
      this.scene.add(pointLight);
    }

    setupControls() {
      let isMouseDown = false;
      let mouseX = 0;
      let mouseY = 0;
      let rotationX = 0.4;
      let rotationY = 0;
      let targetRotationX = 0.4;
      let targetRotationY = 0;

      const onMouseDown = (e) => {
        isMouseDown = true;
        mouseX = e.clientX;
        mouseY = e.clientY;
        this.autoRotate = false;
      };

      const onMouseMove = (e) => {
        if (isMouseDown) {
          const deltaX = e.clientX - mouseX;
          const deltaY = e.clientY - mouseY;
          targetRotationY += deltaX * 0.005;
          targetRotationX += deltaY * 0.005;
          targetRotationX = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, targetRotationX));
          mouseX = e.clientX;
          mouseY = e.clientY;
        }
      };

      const onMouseUp = () => {
        isMouseDown = false;
        setTimeout(() => {
          this.autoRotate = true;
        }, 3000);
      };

      const onWheel = (e) => {
        e.preventDefault();
        const zoomSpeed = 0.001;
        const currentDist = this.camera.position.length();
        const newDist = currentDist + e.deltaY * zoomSpeed * currentDist;
        const minDist = 110;
        const maxDist = 400;
        const clampedDist = Math.max(minDist, Math.min(maxDist, newDist));
        this.camera.position.normalize().multiplyScalar(clampedDist);
      };

      this.renderer.domElement.addEventListener('mousedown', onMouseDown);
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
      this.renderer.domElement.addEventListener('wheel', onWheel, { passive: false });

      this.updateCameraRotation = () => {
        if (!isMouseDown && this.autoRotate) {
          targetRotationY += this.rotationSpeed;
        }
        rotationX += (targetRotationX - rotationX) * 0.1;
        rotationY += (targetRotationY - rotationY) * 0.1;

        const distance = this.camera.position.length();
        this.camera.position.x = distance * Math.cos(rotationX) * Math.sin(rotationY);
        this.camera.position.y = distance * Math.sin(rotationX);
        this.camera.position.z = distance * Math.cos(rotationX) * Math.cos(rotationY);
        this.camera.lookAt(0, 0, 0);
      };
    }

    setupEvents() {
      this.renderer.domElement.addEventListener('click', (e) => this.onMouseClick(e));
      this.renderer.domElement.addEventListener('mousemove', (e) => this.onMouseMoveRaycast(e));
    }

    onMouseClick(event) {
      const rect = this.renderer.domElement.getBoundingClientRect();
      this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      this.raycaster.setFromCamera(this.mouse, this.camera);
      
      const allClickables = [...this.starClickables, ...this.eventClickables];
      const intersects = this.raycaster.intersectObjects(allClickables, true);

      if (intersects.length > 0) {
        const obj = intersects[0].object;
        if (obj.userData && obj.userData.mansion && this.onStarClick) {
          this.onStarClick(obj.userData.mansion);
        } else if (obj.userData && obj.userData.event && this.onEventClick) {
          this.onEventClick(obj.userData.event);
        }
      }
    }

    onMouseMoveRaycast(event) {
      const rect = this.renderer.domElement.getBoundingClientRect();
      this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      this.raycaster.setFromCamera(this.mouse, this.camera);
      
      const allClickables = [...this.starClickables, ...this.eventClickables];
      const intersects = this.raycaster.intersectObjects(allClickables, true);

      if (intersects.length > 0) {
        this.renderer.domElement.style.cursor = 'pointer';
        const obj = intersects[0].object;
        if (this.onStarHover && obj.userData.mansion) {
          this.onStarHover(obj.userData.mansion);
        }
      } else {
        this.renderer.domElement.style.cursor = 'grab';
      }
    }

    addStar(ra, dec, magnitude, color = 0xffffff, userData = {}) {
      const pos = StarData.raDecToVector3(ra, dec, this.sphereRadius);
      const size = Math.max(0.8, 4 - magnitude * 0.8);

      const geometry = new THREE.SphereGeometry(size, 16, 16);
      const material = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0.9
      });
      const star = new THREE.Mesh(geometry, material);
      star.position.copy(pos);
      star.userData = { ...userData, noClipping: true };

      const glowGeometry = new THREE.SphereGeometry(size * 2, 16, 16);
      const glowMaterial = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0.3
      });
      const glow = new THREE.Mesh(glowGeometry, glowMaterial);
      glow.userData = { noClipping: true };
      star.add(glow);

      this.starGroup.add(star);
      this.starClickables.push(star);

      return star;
    }

    addStarLabel(text, ra, dec, color = 0xffffff) {
      const pos = StarData.raDecToVector3(ra, dec, this.sphereRadius + 3);

      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.width = 256;
      canvas.height = 64;

      context.fillStyle = 'transparent';
      context.fillRect(0, 0, canvas.width, canvas.height);

      context.font = 'bold 28px SimHei, Microsoft YaHei, sans-serif';
      context.fillStyle = '#ffffff';
      context.shadowColor = 'rgba(100, 150, 255, 0.8)';
      context.shadowBlur = 10;
      context.textAlign = 'center';
      context.fillText(text, canvas.width / 2, 40);

      const texture = new THREE.CanvasTexture(canvas);
      const material = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        depthTest: false
      });
      const sprite = new THREE.Sprite(material);
      sprite.position.copy(pos);
      sprite.scale.set(12, 3, 1);

      this.starGroup.add(sprite);
      return sprite;
    }

    highlightStar(starId) {
      this.starGroup.children.forEach(child => {
        if (child.userData && child.userData.mansion && child.userData.mansion.id === starId) {
          child.material.color.setHex(0xffff00);
          child.scale.set(2, 2, 2);
        }
      });
    }

    resetHighlights() {
      this.starGroup.children.forEach(child => {
        if (child.userData && child.userData.mansion) {
          const magnitude = child.userData.mansion.magnitude;
          let color = 0xffffff;
          if (magnitude < 1) color = 0xfff0e0;
          child.material.color.setHex(color);
          child.scale.set(1, 1, 1);
        }
      });
    }

    setCoordinateSystem(system) {
      this.currentCoordSystem = system;
      
      this.gridEquatorialGroup.visible = false;
      this.gridEclipticGroup.visible = false;
      this.gridHorizontalGroup.visible = false;
      
      switch (system) {
        case 'equatorial':
          this.gridEquatorialGroup.visible = true;
          break;
        case 'ecliptic':
          this.gridEclipticGroup.visible = true;
          break;
        case 'horizontal':
          this.gridHorizontalGroup.visible = true;
          break;
      }
      
      this.updateClippingPlane(system);
    }

    toggleLayer(layerName, visible) {
      switch (layerName) {
        case 'stars':
          this.starGroup.visible = visible;
          break;
        case 'grid':
          if (this.currentCoordSystem === 'equatorial') {
            this.gridEquatorialGroup.visible = visible;
          } else if (this.currentCoordSystem === 'ecliptic') {
            this.gridEclipticGroup.visible = visible;
          } else if (this.currentCoordSystem === 'horizontal') {
            this.gridHorizontalGroup.visible = visible;
          }
          break;
        case 'twelve':
          this.twelveGroup.visible = visible;
          break;
        case 'events':
          this.eventGroup.visible = visible;
          break;
      }
    }

    animate() {
      requestAnimationFrame(() => this.animate());

      if (this.updateCameraRotation) {
        this.updateCameraRotation();
      }

      this.lst += 0.01;
      if (this.lst > 360) this.lst -= 360;

      this.renderer.render(this.scene, this.camera);
    }

    onWindowResize() {
      const width = this.container.clientWidth;
      const height = this.container.clientHeight;
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(width, height);
    }
  }

  return SceneManager;
})();
