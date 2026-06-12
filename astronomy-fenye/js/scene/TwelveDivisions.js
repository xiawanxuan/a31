import { twelveDivisions, raDecToVector3 } from '../data/starData.js';

export class TwelveDivisions {
  constructor(sceneManager) {
    this.sceneManager = sceneManager;
    this.divisionsGroup = null;
    this.labels = [];

    this.init();
  }

  init() {
    this.divisionsGroup = this.sceneManager.twelveGroup;
    this.createDivisions();
  }

  createDivisions() {
    twelveDivisions.forEach(division => {
      this.createDivisionSector(division);
    });
  }

  createDivisionSector(division) {
    const group = new THREE.Group();
    group.userData = { division };

    const radius = this.sceneManager.sphereRadius + 1;
    const startRad = (division.startRA * Math.PI) / 180;
    const endRad = (division.endRA * Math.PI) / 180;

    let sweepAngle;
    if (division.endRA > division.startRA) {
      sweepAngle = endRad - startRad;
    } else {
      sweepAngle = (endRad + 2 * Math.PI) - startRad;
    }

    const segments = 32;
    const points = [];
    const color = new THREE.Color(division.color);

    for (let i = 0; i <= segments; i++) {
      const angle = startRad + (sweepAngle * i) / segments;
      const x = radius * Math.cos(angle);
      const z = radius * Math.sin(angle);
      points.push(new THREE.Vector3(x, 0, z));
    }

    const tubeGeometry = new THREE.BufferGeometry();
    const positions = [];
    const colors = [];

    for (let dec = -80; dec <= 80; dec += 5) {
      const decRad = (dec * Math.PI) / 180;
      const y = radius * Math.sin(decRad);
      const r = radius * Math.cos(decRad);

      for (let i = 0; i <= segments; i++) {
        const angle = startRad + (sweepAngle * i) / segments;
        const x = r * Math.cos(angle);
        const z = r * Math.sin(angle);
        positions.push(x, y, z);
        colors.push(color.r, color.g, color.b);
      }
    }

    tubeGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    tubeGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    const indices = [];
    const rings = 33;
    const segmentsPerRing = segments + 1;

    for (let ring = 0; ring < rings - 1; ring++) {
      for (let seg = 0; seg < segmentsPerRing - 1; seg++) {
        const a = ring * segmentsPerRing + seg;
        const b = a + 1;
        const c = a + segmentsPerRing;
        const d = c + 1;
        indices.push(a, c, b);
        indices.push(b, c, d);
      }
    }

    tubeGeometry.setIndex(indices);
    tubeGeometry.computeVertexNormals();

    const material = new THREE.MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.15,
      side: THREE.DoubleSide,
      wireframe: false
    });

    const mesh = new THREE.Mesh(tubeGeometry, material);
    group.add(mesh);

    const wireframeMaterial = new THREE.MeshBasicMaterial({
      color: division.color,
      transparent: true,
      opacity: 0.4,
      wireframe: true,
      side: THREE.DoubleSide
    });
    const wireframe = new THREE.Mesh(tubeGeometry, wireframeMaterial);
    group.add(wireframe);

    let midRA = division.startRA + (sweepAngle * 180 / Math.PI) / 2;
    if (midRA > 360) midRA -= 360;

    this.addDivisionLabel(division, midRA, 0);

    this.divisionsGroup.add(group);
    return group;
  }

  addDivisionLabel(division, ra, dec) {
    const pos = raDecToVector3(ra, dec, this.sceneManager.sphereRadius + 8);

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 256;
    canvas.height = 128;

    context.fillStyle = 'transparent';
    context.fillRect(0, 0, canvas.width, canvas.height);

    context.font = 'bold 28px SimHei, Microsoft YaHei, sans-serif';
    context.fillStyle = division.color;
    context.shadowColor = division.color;
    context.shadowBlur = 15;
    context.textAlign = 'center';
    context.fillText(division.name, canvas.width / 2, 50);

    context.font = '18px SimHei, Microsoft YaHei, sans-serif';
    context.fillStyle = '#ffffff';
    context.shadowBlur = 8;
    context.fillText(division.state, canvas.width / 2, 85);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false
    });
    const sprite = new THREE.Sprite(material);
    sprite.position.copy(pos);
    sprite.scale.set(15, 7.5, 1);

    this.divisionsGroup.add(sprite);
    this.labels.push(sprite);
  }

  highlightDivision(divisionId) {
    this.resetHighlights();

    this.divisionsGroup.children.forEach(child => {
      if (child.userData && child.userData.division && child.userData.division.id === divisionId) {
        child.children.forEach(mesh => {
          if (mesh.material) {
            mesh.material.opacity = mesh.material.wireframe ? 0.8 : 0.4;
          }
        });
      }
    });
  }

  resetHighlights() {
    this.divisionsGroup.children.forEach(child => {
      if (child.userData && child.userData.division) {
        child.children.forEach(mesh => {
          if (mesh.material) {
            mesh.material.opacity = mesh.material.wireframe ? 0.4 : 0.15;
          }
        });
      }
    });
  }

  toggleVisibility(visible) {
    this.divisionsGroup.visible = visible;
  }

  static getTwelveDivisions() {
    return twelveDivisions;
  }

  static getDivisionByName(name) {
    return twelveDivisions.find(d => d.name === name);
  }
}
