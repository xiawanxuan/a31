import {
  raDecToVector3,
  equatorialToEcliptic,
  eclipticToEquatorial,
  equatorialToHorizontal,
  twentyEightMansions
} from '../data/starData.js';

export class CoordinateSystem {
  constructor(sceneManager) {
    this.sceneManager = sceneManager;
    this.currentSystem = 'equatorial';
    this.observerLat = 35;
    this.observerLon = 110;
    this.lst = 0;
    this.transitionDuration = 800;
    this.isTransitioning = false;
  }

  setSystem(system) {
    if (system === this.currentSystem) return;

    const previousSystem = this.currentSystem;
    this.currentSystem = system;

    this.animateStarTransition(previousSystem, system);
    this.sceneManager.setCoordinateSystem(system);
    this.updateGridLabels();
  }

  animateStarTransition(fromSystem, toSystem) {
    if (this.isTransitioning) return;
    this.isTransitioning = true;

    const startTime = performance.now();
    const duration = this.transitionDuration;

    const starPositions = this.sceneManager.starGroup.children
      .filter(child => child.userData && child.userData.mansion)
      .map(child => ({
        mesh: child,
        mansion: child.userData.mansion,
        startPos: child.position.clone()
      }));

    starPositions.forEach(sp => {
      const mansion = sp.mansion;
      const targetPos = this.getTargetPosition(mansion.ra, mansion.dec, toSystem);
      sp.targetPos = targetPos;
    });

    const labelPositions = this.sceneManager.starGroup.children
      .filter(child => child.isSprite && child.userData && child.userData.isLabel)
      .map(sprite => {
        const mansion = twentyEightMansions.find(m => 
          Math.abs(m.ra - sprite.userData.ra) < 0.1 && 
          Math.abs(m.dec - sprite.userData.dec) < 0.1
        );
        if (mansion) {
          const targetPos = this.getTargetPosition(mansion.ra, mansion.dec, toSystem);
          targetPos.multiplyScalar((this.sceneManager.sphereRadius + 3) / this.sceneManager.sphereRadius);
          return {
            sprite: sprite,
            startPos: sprite.position.clone(),
            targetPos: targetPos
          };
        }
        return null;
      }).filter(item => item !== null);

    const animateFrame = (currentTime) => {
      const elapsed = currentTime - startTime;
      const t = Math.min(elapsed / duration, 1);
      const eased = this.easeInOutCubic(t);

      starPositions.forEach(sp => {
        if (sp.targetPos) {
          sp.mesh.position.lerpVectors(sp.startPos, sp.targetPos, eased);
        }
      });

      labelPositions.forEach(lp => {
        if (lp.targetPos) {
          lp.sprite.position.lerpVectors(lp.startPos, lp.targetPos, eased);
        }
      });

      if (t < 1) {
        requestAnimationFrame(animateFrame);
      } else {
        this.isTransitioning = false;
        this.rebuildConstellationLines(toSystem);
      }
    };

    requestAnimationFrame(animateFrame);
  }

  getTargetPosition(ra, dec, system) {
    switch (system) {
      case 'equatorial':
        return raDecToVector3(ra, dec, this.sceneManager.sphereRadius);
      case 'ecliptic': {
        const ecl = equatorialToEcliptic(ra, dec);
        const eq = eclipticToEquatorial(ecl.lambda, ecl.beta);
        return raDecToVector3(eq.ra, eq.dec, this.sceneManager.sphereRadius);
      }
      case 'horizontal': {
        const hor = equatorialToHorizontal(ra, dec, this.lst, this.observerLat);
        const azRad = (hor.az * Math.PI) / 180;
        const altRad = (hor.alt * Math.PI) / 180;
        const r = this.sceneManager.sphereRadius;
        const x = r * Math.cos(altRad) * Math.cos(azRad);
        const y = r * Math.sin(altRad);
        const z = r * Math.cos(altRad) * Math.sin(azRad);
        return new THREE.Vector3(x, y, z);
      }
      default:
        return raDecToVector3(ra, dec, this.sceneManager.sphereRadius);
    }
  }

  rebuildConstellationLines(system) {
    const constellationGroup = this.sceneManager.constellationGroup;
    while (constellationGroup.children.length > 0) {
      const child = constellationGroup.children[0];
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
      constellationGroup.remove(child);
    }

    twentyEightMansions.forEach(mansion => {
      if (!mansion.stars || mansion.stars.length < 2) return;

      for (let i = 0; i < mansion.stars.length - 1; i++) {
        const star1 = mansion.stars[i];
        const star2 = mansion.stars[i + 1];

        const pos1 = this.getTargetPosition(star1.ra, star1.dec, system);
        const pos2 = this.getTargetPosition(star2.ra, star2.dec, system);

        const geometry = new THREE.BufferGeometry().setFromPoints([pos1, pos2]);
        const material = new THREE.LineBasicMaterial({
          color: 0x88aaff,
          transparent: true,
          opacity: 0.6
        });
        const line = new THREE.Line(geometry, material);
        line.userData = { mansionId: mansion.id };
        constellationGroup.add(line);
      }
    });
  }

  easeInOutCubic(t) {
    return t < 0.5
      ? 4 * t * t * t
      : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  getSystem() {
    return this.currentSystem;
  }

  convertStarPosition(ra, dec) {
    switch (this.currentSystem) {
      case 'equatorial':
        return { ra, dec, system: 'equatorial' };
      case 'ecliptic':
        return { ...equatorialToEcliptic(ra, dec), system: 'ecliptic' };
      case 'horizontal':
        return {
          ...equatorialToHorizontal(ra, dec, this.lst, this.observerLat),
          system: 'horizontal'
        };
      default:
        return { ra, dec, system: 'equatorial' };
    }
  }

  updateGridLabels() {
    console.log(`切换到${this.getSystemName()}坐标系`);
  }

  getSystemName() {
    const names = {
      equatorial: '赤道',
      ecliptic: '黄道',
      horizontal: '地平'
    };
    return names[this.currentSystem] || '赤道';
  }

  getAxesLabels() {
    switch (this.currentSystem) {
      case 'equatorial':
        return { x: '赤经 (RA)', y: '赤纬 (Dec)' };
      case 'ecliptic':
        return { x: '黄经 (λ)', y: '黄纬 (β)' };
      case 'horizontal':
        return { x: '方位角 (Az)', y: '高度角 (Alt)' };
      default:
        return { x: '赤经 (RA)', y: '赤纬 (Dec)' };
    }
  }

  setObserverLocation(lat, lon) {
    this.observerLat = lat;
    this.observerLon = lon;
  }

  setLocalSiderealTime(lst) {
    this.lst = lst;
  }

  createCoordinateGrid(type) {
    const lines = [];
    const radius = this.sceneManager.sphereRadius;

    if (type === 'equatorial' || type === 'ecliptic') {
      for (let lon = 0; lon < 360; lon += 30) {
        const points = [];
        for (let lat = -90; lat <= 90; lat += 5) {
          let ra, dec;
          if (type === 'equatorial') {
            ra = lon;
            dec = lat;
          } else {
            const eq = eclipticToEquatorial(lon, lat);
            ra = eq.ra;
            dec = eq.dec;
          }
          points.push(raDecToVector3(ra, dec, radius));
        }
        lines.push(points);
      }
    }

    return lines;
  }

  static getEclipticObliquity() {
    return 23.4397;
  }

  static getZodiacSigns() {
    return [
      { name: '白羊宫', start: 0, end: 30, twelves: '降娄' },
      { name: '金牛宫', start: 30, end: 60, twelves: '大梁' },
      { name: '双子宫', start: 60, end: 90, twelves: '实沈' },
      { name: '巨蟹宫', start: 90, end: 120, twelves: '鹑首' },
      { name: '狮子宫', start: 120, end: 150, twelves: '鹑火' },
      { name: '室女宫', start: 150, end: 180, twelves: '鹑尾' },
      { name: '天秤宫', start: 180, end: 210, twelves: '寿星' },
      { name: '天蝎宫', start: 210, end: 240, twelves: '大火' },
      { name: '人马宫', start: 240, end: 270, twelves: '析木' },
      { name: '摩羯宫', start: 270, end: 300, twelves: '星纪' },
      { name: '宝瓶宫', start: 300, end: 330, twelves: '玄枵' },
      { name: '双鱼宫', start: 330, end: 360, twelves: '娵訾' }
    ];
  }
}
