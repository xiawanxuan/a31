window.CoordinateSystem = (function() {
  class CoordinateSystem {
    constructor(sceneManager) {
      this.sceneManager = sceneManager;
      this.currentSystem = 'equatorial';
      this.observerLat = 35;
      this.observerLon = 110;
      this.lst = 0;
    }

    setSystem(system) {
      this.currentSystem = system;
      this.sceneManager.setCoordinateSystem(system);
      this.updateGridLabels();
    }

    getSystem() {
      return this.currentSystem;
    }

    convertStarPosition(ra, dec) {
      switch (this.currentSystem) {
        case 'equatorial':
          return { ra, dec, system: 'equatorial' };
        case 'ecliptic':
          return { ...StarData.equatorialToEcliptic(ra, dec), system: 'ecliptic' };
        case 'horizontal':
          return {
            ...StarData.equatorialToHorizontal(ra, dec, this.lst, this.observerLat),
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
              const eq = StarData.eclipticToEquatorial(lon, lat);
              ra = eq.ra;
              dec = eq.dec;
            }
            points.push(StarData.raDecToVector3(ra, dec, radius));
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

  return CoordinateSystem;
})();
