import { twentyEightMansions, twelveDivisions, statesMap, warringStatesGeoJSON } from '../data/starData.js';

export class FenyeSystem {
  constructor(sceneManager, mapContainerId) {
    this.sceneManager = sceneManager;
    this.mapContainer = document.getElementById(mapContainerId);
    this.svg = null;
    this.currentHighlightedState = null;
    this.currentHighlightedMansion = null;
    this.mapMode = 'simple';
    this.projection = null;
    this.pathGenerator = null;
    this.width = 0;
    this.height = 250;

    this.init();
  }

  init() {
    this.createFenyeMap();
  }

  createFenyeMap() {
    this.width = this.mapContainer.clientWidth || 300;
    this.height = 320;

    d3.select(this.mapContainer).selectAll('svg').remove();

    this.svg = d3.select(this.mapContainer)
      .append('svg')
      .attr('width', this.width)
      .attr('height', this.height);

    const defs = this.svg.append('defs');

    const glow = defs.append('filter')
      .attr('id', 'fenye-glow');
    glow.append('feGaussianBlur')
      .attr('stdDeviation', '3')
      .attr('result', 'blur');
    glow.append('feMerge')
      .selectAll('feMergeNode')
      .data(['blur', 'SourceGraphic'])
      .enter()
      .append('feMergeNode')
      .attr('in', d => d);

    this.svg.append('rect')
      .attr('width', this.width)
      .attr('height', this.height)
      .attr('fill', 'rgba(10, 15, 35, 0.6)')
      .attr('rx', 8);

    this.setupProjection();

    if (this.mapMode === 'detailed') {
      this.renderDetailedMap();
    } else {
      this.renderSimpleMap();
    }

    this.addCompass();
    this.addTitle();
  }

  setupProjection() {
    const padding = 30;
    this.projection = d3.geoMercator()
      .center([113, 34])
      .scale(this.width * 2.8)
      .translate([this.width / 2, this.height / 2 + 10]);

    this.pathGenerator = d3.geoPath()
      .projection(this.projection);
  }

  renderDetailedMap() {
    const mapGroup = this.svg.append('g').attr('class', 'detailed-map-group');

    mapGroup.selectAll('path.state-polygon')
      .data(warringStatesGeoJSON.features)
      .enter()
      .append('path')
      .attr('class', d => `state-polygon state-${d.properties.id}`)
      .attr('d', this.pathGenerator)
      .attr('fill', d => d.properties.color)
      .attr('fill-opacity', 0.35)
      .attr('stroke', d => d.properties.color)
      .attr('stroke-width', 1.5)
      .attr('stroke-opacity', 0.7)
      .style('cursor', 'pointer')
      .on('mouseover', (event, d) => this.highlightState(d.properties.id))
      .on('mouseout', () => this.resetHighlight())
      .on('click', (event, d) => this.onStateClick(d.properties));

    mapGroup.selectAll('text.state-label')
      .data(warringStatesGeoJSON.features)
      .enter()
      .append('text')
      .attr('class', d => `state-label state-label-${d.properties.id}`)
      .attr('x', d => {
        const centroid = this.pathGenerator.centroid(d);
        return centroid[0];
      })
      .attr('y', d => {
        const centroid = this.pathGenerator.centroid(d);
        return centroid[1];
      })
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .attr('fill', '#e0e8ff')
      .attr('font-size', '11px')
      .attr('font-weight', 'bold')
      .style('pointer-events', 'none')
      .style('text-shadow', '0 0 6px rgba(0,0,0,0.8)')
      .text(d => d.properties.name);

    mapGroup.selectAll('text.state-region-label')
      .data(warringStatesGeoJSON.features)
      .enter()
      .append('text')
      .attr('class', d => `state-region-label state-region-${d.properties.id}`)
      .attr('x', d => {
        const centroid = this.pathGenerator.centroid(d);
        return centroid[0];
      })
      .attr('y', d => {
        const centroid = this.pathGenerator.centroid(d);
        return centroid[1] + 14;
      })
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .attr('fill', '#8af')
      .attr('font-size', '9px')
      .style('pointer-events', 'none')
      .style('text-shadow', '0 0 4px rgba(0,0,0,0.8)')
      .text(d => d.properties.region);
  }

  renderSimpleMap() {
    const mapGroup = this.svg.append('g').attr('class', 'simple-map-group');

    const scale = 0.7;
    const offsetX = 30;
    const offsetY = 10;

    statesMap.forEach(state => {
      const stateGroup = mapGroup.append('g')
        .attr('class', `state-group state-${state.id}`)
        .attr('transform', `translate(${state.x * scale + offsetX}, ${state.y * scale + offsetY})`)
        .style('cursor', 'pointer')
        .on('mouseover', () => this.highlightState(state.id))
        .on('mouseout', () => this.resetHighlight())
        .on('click', () => this.onStateClick(state));

      stateGroup.append('circle')
        .attr('r', 18)
        .attr('fill', state.color)
        .attr('opacity', 0.5)
        .attr('stroke', 'rgba(255, 255, 255, 0.3)')
        .attr('stroke-width', 1);

      stateGroup.append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', '0.35em')
        .attr('fill', '#fff')
        .attr('font-size', '13px')
        .attr('font-weight', 'bold')
        .text(state.name);

      stateGroup.append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', '2em')
        .attr('fill', '#8af')
        .attr('font-size', '9px')
        .text(state.region);
    });

    this.addConnectionLines(mapGroup, scale, offsetX, offsetY);
  }

  addConnectionLines(group, scale, offsetX, offsetY) {
    const connections = [
      ['qin', 'jin'], ['jin', 'zhao'], ['zhao', 'yan'],
      ['zhao', 'wei'], ['wei', 'han'], ['han', 'zheng'],
      ['zheng', 'zhou'], ['zhou', 'chu'], ['chu', 'wu'],
      ['wu', 'yue'], ['qi', 'lu'], ['lu', 'song'],
      ['song', 'wei_spring'], ['wei_spring', 'han'],
      ['qin', 'zhou']
    ];

    connections.forEach(([fromId, toId]) => {
      const from = statesMap.find(s => s.id === fromId);
      const to = statesMap.find(s => s.id === toId);
      if (!from || !to) return;

      group.append('line')
        .attr('x1', from.x * scale + offsetX)
        .attr('y1', from.y * scale + offsetY)
        .attr('x2', to.x * scale + offsetX)
        .attr('y2', to.y * scale + offsetY)
        .attr('stroke', 'rgba(100, 150, 255, 0.15)')
        .attr('stroke-width', 1)
        .attr('stroke-dasharray', '3,3');
    });
  }

  addCompass() {
    const cx = this.width - 30;
    const cy = 30;

    const compass = this.svg.append('g')
      .attr('class', 'compass')
      .attr('transform', `translate(${cx}, ${cy})`);

    compass.append('circle')
      .attr('r', 18)
      .attr('fill', 'none')
      .attr('stroke', 'rgba(138, 170, 255, 0.3)')
      .attr('stroke-width', 1);

    compass.append('text')
      .attr('y', -10)
      .attr('text-anchor', 'middle')
      .attr('fill', '#ff6666')
      .attr('font-size', '10px')
      .attr('font-weight', 'bold')
      .text('北');

    compass.append('text')
      .attr('y', 18)
      .attr('text-anchor', 'middle')
      .attr('fill', '#8af')
      .attr('font-size', '9px')
      .text('南');

    compass.append('text')
      .attr('x', -14)
      .attr('dy', '0.35em')
      .attr('text-anchor', 'middle')
      .attr('fill', '#8af')
      .attr('font-size', '9px')
      .text('西');

    compass.append('text')
      .attr('x', 14)
      .attr('dy', '0.35em')
      .attr('text-anchor', 'middle')
      .attr('fill', '#8af')
      .attr('font-size', '9px')
      .text('东');
  }

  addTitle() {
    this.svg.append('text')
      .attr('x', 15)
      .attr('y', 20)
      .attr('fill', '#8af')
      .attr('font-size', '12px')
      .attr('font-weight', 'bold')
      .text('战国分野图');
  }

  highlightState(stateId) {
    this.resetHighlight();
    this.currentHighlightedState = stateId;

    if (this.mapMode === 'detailed') {
      d3.select(`.state-polygon.state-${stateId}`)
        .transition()
        .duration(300)
        .attr('fill-opacity', 0.7)
        .attr('stroke-width', 3)
        .attr('stroke', '#ffd700')
        .attr('filter', 'url(#fenye-glow)');

      d3.select(`.state-label-${stateId}`)
        .transition()
        .duration(300)
        .attr('fill', '#ffd700')
        .attr('font-size', '14px');
    } else {
      d3.select(`.state-${stateId}`)
        .select('circle')
        .transition()
        .duration(300)
        .attr('r', 25)
        .attr('opacity', 1)
        .attr('stroke', '#ffd700')
        .attr('stroke-width', 3);

      d3.select(`.state-${stateId}`)
        .selectAll('text')
        .transition()
        .duration(300)
        .attr('fill', '#ffd700');
    }

    const relatedMansions = twentyEightMansions.filter(m => {
      if (stateId === 'wei_spring') return m.state === '卫';
      if (stateId === 'wei') return m.state === '魏';
      return m.state === statesMap.find(s => s.id === stateId)?.name;
    });

    if (relatedMansions.length > 0 && this.sceneManager) {
      relatedMansions.forEach(m => {
        this.sceneManager.highlightStar(m.id);
      });
    }
  }

  highlightMansion(mansionId) {
    this.resetHighlight();
    this.currentHighlightedMansion = mansionId;

    const mansion = twentyEightMansions.find(m => m.id === mansionId);
    if (!mansion) return;

    let stateId = null;
    if (mansion.state === '魏') {
      stateId = 'wei';
    } else if (mansion.state === '卫') {
      stateId = 'wei_spring';
    } else {
      const state = statesMap.find(s => s.name === mansion.state);
      if (state) stateId = state.id;
    }

    if (stateId) {
      if (this.mapMode === 'detailed') {
        d3.select(`.state-polygon.state-${stateId}`)
          .transition()
          .duration(300)
          .attr('fill-opacity', 0.7)
          .attr('stroke-width', 3)
          .attr('stroke', '#ffd700')
          .attr('filter', 'url(#fenye-glow)');

        d3.select(`.state-label-${stateId}`)
          .transition()
          .duration(300)
          .attr('fill', '#ffd700')
          .attr('font-size', '14px');

        d3.select(`.state-region-${stateId}`)
          .transition()
          .duration(300)
          .attr('fill', '#ffd700');
      } else {
        d3.select(`.state-${stateId}`)
          .select('circle')
          .transition()
          .duration(300)
          .attr('r', 25)
          .attr('opacity', 1)
          .attr('stroke', '#ffd700')
          .attr('stroke-width', 3);

        d3.select(`.state-${stateId}`)
          .selectAll('text')
          .transition()
          .duration(300)
          .attr('fill', '#ffd700');
      }
    }

    if (this.sceneManager) {
      this.sceneManager.highlightStar(mansionId);
    }

    this.updateFenyeInfo(mansion, stateId);
  }

  resetHighlight() {
    if (this.mapMode === 'detailed') {
      d3.selectAll('.state-polygon')
        .transition()
        .duration(200)
        .attr('fill-opacity', 0.35)
        .attr('stroke-width', 1.5)
        .attr('stroke', function() {
          return d3.select(this.parentNode).datum()?.properties?.color || '#888';
        })
        .attr('filter', 'none');

      d3.selectAll('.state-label')
        .transition()
        .duration(200)
        .attr('fill', '#e0e8ff')
        .attr('font-size', '11px');

      d3.selectAll('.state-region-label')
        .transition()
        .duration(200)
        .attr('fill', '#8af');
    } else {
      d3.selectAll('.state-group circle')
        .transition()
        .duration(200)
        .attr('r', 18)
        .attr('opacity', 0.5)
        .attr('stroke', 'rgba(255, 255, 255, 0.3)')
        .attr('stroke-width', 1);

      d3.selectAll('.state-group text')
        .transition()
        .duration(200)
        .attr('fill', function(d, i) {
          return i === 0 ? '#fff' : '#8af';
        });
    }

    if (this.sceneManager) {
      this.sceneManager.resetHighlights();
    }

    this.currentHighlightedState = null;
    this.currentHighlightedMansion = null;
  }

  updateFenyeInfo(mansion, stateId) {
    const infoDiv = document.getElementById('fenye-info');
    const nameDiv = document.getElementById('fenye-name');
    const descDiv = document.getElementById('fenye-desc');

    if (infoDiv && nameDiv && descDiv) {
      infoDiv.classList.remove('hidden');
      nameDiv.textContent = `${mansion.name} · ${mansion.fenye}分野`;
      descDiv.innerHTML = `
        对应诸侯国：<strong>${mansion.state}</strong><br>
        所属十二次：<strong>${mansion.twelve}</strong><br>
        分野区域：<strong>${mansion.fenye}</strong><br>
        <span style="color:#8af;font-size:11px;">${mansion.description.substring(0, 40)}...</span>
      `;
    }
  }

  onStateClick(state) {
    const stateName = state.name || state.properties?.name;
    const stateId = state.id || state.properties?.id;
    const region = state.region || state.properties?.region;

    const mansions = twentyEightMansions.filter(m => {
      if (stateId === 'wei_spring') return m.state === '卫';
      if (stateId === 'wei') return m.state === '魏';
      return m.state === stateName;
    });

    if (mansions.length > 0) {
      const infoDiv = document.getElementById('fenye-info');
      const nameDiv = document.getElementById('fenye-name');
      const descDiv = document.getElementById('fenye-desc');

      if (infoDiv && nameDiv && descDiv) {
        infoDiv.classList.remove('hidden');
        nameDiv.textContent = `${stateName}国 · ${region}分野`;
        descDiv.innerHTML = `
          对应星宿：<strong>${mansions.map(m => m.name).join('、')}</strong><br>
          所属十二次：<strong>${[...new Set(mansions.map(m => m.twelve))].join('、')}</strong><br>
          <span style="color:#8af;font-size:11px;">${mansions.map(m => m.description.substring(0, 20)).join('；')}</span>
        `;
      }

      if (this.sceneManager) {
        mansions.forEach(m => {
          this.sceneManager.highlightStar(m.id);
        });
      }
    }
  }

  setMapMode(mode) {
    this.mapMode = mode;
    this.createFenyeMap();

    if (this.currentHighlightedMansion) {
      this.highlightMansion(this.currentHighlightedMansion);
    } else if (this.currentHighlightedState) {
      this.highlightState(this.currentHighlightedState);
    }
  }

  getMansionsByState(stateName) {
    return twentyEightMansions.filter(m => m.state === stateName);
  }

  getStateByMansion(mansionId) {
    const mansion = twentyEightMansions.find(m => m.id === mansionId);
    return mansion ? mansion.state : null;
  }

  getTwelveByMansion(mansionId) {
    const mansion = twentyEightMansions.find(m => m.id === mansionId);
    return mansion ? mansion.twelve : null;
  }

  highlightTwelveDivision(twelveName) {
    const division = twelveDivisions.find(t => t.name === twelveName);
    if (!division) return;

    const relatedMansions = twentyEightMansions.filter(m => m.twelve === twelveName);
    relatedMansions.forEach(m => {
      this.highlightMansion(m.id);
    });
  }

  static getFenyeMap() {
    return twentyEightMansions.map(m => ({
      mansion: m.name,
      state: m.state,
      region: m.fenye,
      twelve: m.twelve
    }));
  }
}
