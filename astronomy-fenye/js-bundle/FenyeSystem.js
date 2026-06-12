window.FenyeSystem = (function() {
  class FenyeSystem {
    constructor(sceneManager, mapContainerId) {
      this.sceneManager = sceneManager;
      this.mapContainer = document.getElementById(mapContainerId);
      this.svg = null;
      this.currentHighlightedState = null;
      this.currentHighlightedMansion = null;

      this.init();
    }

    init() {
      this.createFenyeMap();
    }

    createFenyeMap() {
      const width = this.mapContainer.clientWidth;
      const height = 250;

      this.svg = d3.select(this.mapContainer)
        .append('svg')
        .attr('width', width)
        .attr('height', height);

      const defs = this.svg.append('defs');

      const gradient = defs.append('radialGradient')
        .attr('id', 'mapGlow')
        .attr('cx', '50%')
        .attr('cy', '50%')
        .attr('r', '50%');
      gradient.append('stop')
        .attr('offset', '0%')
        .attr('stop-color', 'rgba(80, 120, 200, 0.3)');
      gradient.append('stop')
        .attr('offset', '100%')
        .attr('stop-color', 'rgba(20, 40, 80, 0.1)');

      this.svg.append('rect')
        .attr('width', width)
        .attr('height', height)
        .attr('fill', 'rgba(20, 30, 60, 0.3)');

      const mapGroup = this.svg.append('g')
        .attr('class', 'states-group');

      const scale = 0.7;
      const offsetX = 30;
      const offsetY = 10;

      StarData.statesMap.forEach(state => {
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
          .attr('opacity', 0.6)
          .attr('stroke', 'rgba(255, 255, 255, 0.5)')
          .attr('stroke-width', 1);

        stateGroup.append('text')
          .attr('text-anchor', 'middle')
          .attr('dy', '0.35em')
          .attr('fill', '#fff')
          .attr('font-size', '14px')
          .attr('font-weight', 'bold')
          .text(state.name);

        stateGroup.append('text')
          .attr('text-anchor', 'middle')
          .attr('dy', '2em')
          .attr('fill', '#8af')
          .attr('font-size', '10px')
          .text(state.region);
      });

      this.addLegend(width, height);
    }

    addLegend(width, height) {
      const legend = this.svg.append('g')
        .attr('class', 'legend')
        .attr('transform', `translate(10, ${height - 40})`);

      const directions = [
        { name: '北', x: 60, y: 0 },
        { name: '南', x: 60, y: 20 },
        { name: '西', x: 30, y: 10 },
        { name: '东', x: 90, y: 10 }
      ];

      directions.forEach(dir => {
        legend.append('text')
          .attr('x', dir.x)
          .attr('y', dir.y)
          .attr('text-anchor', 'middle')
          .attr('fill', '#8af')
          .attr('font-size', '10px')
          .text(dir.name);
      });

      legend.append('circle')
        .attr('cx', 60)
        .attr('cy', 10)
        .attr('r', 8)
        .attr('fill', 'none')
        .attr('stroke', 'rgba(138, 170, 255, 0.5)')
        .attr('stroke-width', 1);
    }

    highlightState(stateId) {
      this.resetHighlight();
      this.currentHighlightedState = stateId;

      d3.select(`.state-${stateId}`)
        .select('circle')
        .transition()
        .duration(300)
        .attr('r', 25)
        .attr('opacity', 1)
        .attr('stroke', '#fff')
        .attr('stroke-width', 2);

      const relatedMansions = StarData.twentyEightMansions.filter(m => {
        if (stateId === 'wei_spring') return m.state === '卫';
        if (stateId === 'wei') return m.state === '魏';
        return m.state === StarData.statesMap.find(s => s.id === stateId)?.name;
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

      const mansion = StarData.twentyEightMansions.find(m => m.id === mansionId);
      if (!mansion) return;

      let stateId = null;
      if (mansion.state === '魏') {
        stateId = 'wei';
      } else if (mansion.state === '卫') {
        stateId = 'wei_spring';
      } else {
        const state = StarData.statesMap.find(s => s.name === mansion.state);
        if (state) stateId = state.id;
      }

      if (stateId) {
        d3.select(`.state-${stateId}`)
          .select('circle')
          .transition()
          .duration(300)
          .attr('r', 25)
          .attr('opacity', 1)
          .attr('stroke', '#ffd700')
          .attr('stroke-width', 3);
      }

      if (this.sceneManager) {
        this.sceneManager.highlightStar(mansionId);
      }

      this.updateFenyeInfo(mansion, stateId);
    }

    resetHighlight() {
      d3.selectAll('.state-group circle')
        .transition()
        .duration(200)
        .attr('r', 18)
        .attr('opacity', 0.6)
        .attr('stroke', 'rgba(255, 255, 255, 0.5)')
        .attr('stroke-width', 1);

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
          分野区域：<strong>${mansion.fenye}</strong>
        `;
      }
    }

    onStateClick(state) {
      console.log(`点击了 ${state.name} 国`);
      const mansions = StarData.twentyEightMansions.filter(m => {
        if (state.id === 'wei_spring') return m.state === '卫';
        if (state.id === 'wei') return m.state === '魏';
        return m.state === state.name;
      });

      if (mansions.length > 0) {
        const infoDiv = document.getElementById('fenye-info');
        const nameDiv = document.getElementById('fenye-name');
        const descDiv = document.getElementById('fenye-desc');

        if (infoDiv && nameDiv && descDiv) {
          infoDiv.classList.remove('hidden');
          nameDiv.textContent = `${state.name}国 · ${state.region}分野`;
          descDiv.innerHTML = `
            对应星宿：<strong>${mansions.map(m => m.name).join('、')}</strong><br>
            所属十二次：<strong>${[...new Set(mansions.map(m => m.twelve))].join('、')}</strong>
          `;
        }
      }
    }

    getMansionsByState(stateName) {
      return StarData.twentyEightMansions.filter(m => m.state === stateName);
    }

    getStateByMansion(mansionId) {
      const mansion = StarData.twentyEightMansions.find(m => m.id === mansionId);
      return mansion ? mansion.state : null;
    }

    getTwelveByMansion(mansionId) {
      const mansion = StarData.twentyEightMansions.find(m => m.id === mansionId);
      return mansion ? mansion.twelve : null;
    }

    highlightTwelveDivision(twelveName) {
      const division = StarData.twelveDivisions.find(t => t.name === twelveName);
      if (!division) return;

      const relatedMansions = StarData.twentyEightMansions.filter(m => m.twelve === twelveName);
      relatedMansions.forEach(m => {
        this.highlightMansion(m.id);
      });
    }

    static getFenyeMap() {
      return StarData.twentyEightMansions.map(m => ({
        mansion: m.name,
        state: m.state,
        region: m.fenye,
        twelve: m.twelve
      }));
    }
  }

  return FenyeSystem;
})();
