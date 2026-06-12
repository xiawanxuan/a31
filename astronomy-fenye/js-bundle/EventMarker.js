window.EventMarker = (function() {
  class EventMarker {
    constructor(sceneManager, eventListContainerId) {
      this.sceneManager = sceneManager;
      this.eventListContainer = document.getElementById(eventListContainerId);
      this.eventMarkers = [];
      this.currentHighlightedEvent = null;
      this.onEventClick = null;

      this.init();
    }

    init() {
      this.createEventList();
    }

    createEventMarkers() {
      StarData.historicalEvents.forEach(event => {
        this.addEventBalloon(event);
      });
    }

    addEventBalloon(event) {
      const group = new THREE.Group();
      group.userData = { event };

      const pos = StarData.raDecToVector3(event.ra, event.dec, this.sceneManager.sphereRadius + 5);

      const balloonGeo = new THREE.SphereGeometry(3, 16, 16);
      const balloonMat = new THREE.MeshBasicMaterial({
        color: 0xff5555,
        transparent: true,
        opacity: 0.7
      });
      const balloon = new THREE.Mesh(balloonGeo, balloonMat);
      balloon.position.copy(pos);
      group.add(balloon);

      const glowGeo = new THREE.SphereGeometry(5, 16, 16);
      const glowMat = new THREE.MeshBasicMaterial({
        color: 0xff3333,
        transparent: true,
        opacity: 0.3
      });
      const glow = new THREE.Mesh(glowGeo, glowMat);
      balloon.add(glow);

      const stemGeo = new THREE.CylinderGeometry(0.2, 0.3, 4, 8);
      const stemMat = new THREE.MeshBasicMaterial({
        color: 0xff6666,
        transparent: true,
        opacity: 0.5
      });
      const stem = new THREE.Mesh(stemGeo, stemMat);
      stem.position.copy(pos);
      const direction = pos.clone().normalize();
      stem.position.add(direction.clone().multiplyScalar(-4));
      stem.lookAt(pos);
      stem.rotateX(Math.PI / 2);
      group.add(stem);

      const labelPos = pos.clone().multiplyScalar(1.1);
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.width = 512;
      canvas.height = 128;

      context.fillStyle = 'rgba(0, 0, 0, 0)';
      context.fillRect(0, 0, canvas.width, canvas.height);

      context.font = 'bold 32px SimHei, Microsoft YaHei, sans-serif';
      context.fillStyle = '#ff8888';
      context.shadowColor = 'rgba(255, 50, 50, 0.8)';
      context.shadowBlur = 15;
      context.textAlign = 'center';
      context.fillText(event.name, canvas.width / 2, 50);

      context.font = '24px SimHei, Microsoft YaHei, sans-serif';
      context.fillStyle = '#ffcc88';
      context.shadowBlur = 10;
      context.fillText(event.date, canvas.width / 2, 90);

      const texture = new THREE.CanvasTexture(canvas);
      const spriteMat = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        depthTest: false
      });
      const sprite = new THREE.Sprite(spriteMat);
      sprite.position.copy(labelPos);
      sprite.scale.set(25, 6, 1);
      group.add(sprite);

      this.sceneManager.eventGroup.add(group);
      this.eventMarkers.push({ group, balloon, event, sprite });

      balloon.userData = { event, noClipping: true };
      this.sceneManager.eventClickables.push(balloon);

      return group;
    }

    createEventList() {
      if (!this.eventListContainer) return;

      StarData.historicalEvents.forEach(event => {
        const item = document.createElement('div');
        item.className = 'event-item';
        item.dataset.eventId = event.id;
        item.innerHTML = `
          <div class="event-name">${event.name}</div>
          <div class="event-desc">${event.date} · ${event.dynasty}</div>
        `;

        item.addEventListener('click', () => {
          this.focusOnEvent(event.id);
        });

        item.addEventListener('mouseenter', () => {
          this.highlightEvent(event.id);
        });

        item.addEventListener('mouseleave', () => {
          this.resetEventHighlight();
        });

        this.eventListContainer.appendChild(item);
      });
    }

    highlightEvent(eventId) {
      this.resetEventHighlight();

      const eventMarker = this.eventMarkers.find(e => e.event.id === eventId);
      if (eventMarker) {
        eventMarker.balloon.scale.set(1.5, 1.5, 1.5);
        eventMarker.balloon.material.color.setHex(0xffff00);
        this.currentHighlightedEvent = eventId;
      }

      const item = this.eventListContainer.querySelector(`[data-event-id="${eventId}"]`);
      if (item) {
        item.style.background = 'rgba(255, 100, 100, 0.3)';
        item.style.borderColor = 'rgba(255, 150, 150, 0.8)';
      }
    }

    resetEventHighlight() {
      this.eventMarkers.forEach(em => {
        em.balloon.scale.set(1, 1, 1);
        em.balloon.material.color.setHex(0xff5555);
      });

      this.eventListContainer.querySelectorAll('.event-item').forEach(item => {
        item.style.background = '';
        item.style.borderColor = '';
      });

      this.currentHighlightedEvent = null;
    }

    focusOnEvent(eventId) {
      const event = StarData.historicalEvents.find(e => e.id === eventId);
      if (!event) return;

      this.highlightEvent(eventId);

      if (this.onEventClick) {
        this.onEventClick(event);
      }

      const eventInfo = document.getElementById('star-info');
      if (eventInfo) {
        const starName = eventInfo.querySelector('.star-name');
        const starDetail = eventInfo.querySelector('.star-detail');
        if (starName && starDetail) {
          starName.textContent = event.name;
          starDetail.innerHTML = `
            <strong>时间：</strong>${event.date}（${event.dynasty}）<br>
            <strong>星宿：</strong>${this.getMansionName(event.star)}<br>
            <strong>描述：</strong>${event.description}<br><br>
            <strong>星占意义：</strong>${event.significance}<br>
            <strong>史料记载：</strong>${event.historicalRecord}
          `;
        }
      }
    }

    getMansionName(starId) {
      const mansions = {
        jiao: '角宿', kang: '亢宿', di: '氐宿', fang: '房宿',
        xin: '心宿', wei: '尾宿', ji: '箕宿', dou: '斗宿',
        niu: '牛宿', nü: '女宿', xu: '虚宿', wei_north: '危宿',
        shi: '室宿', bi_north: '壁宿', kui: '奎宿', lou: '娄宿',
        wei_west: '胃宿', mao: '昴宿', bi_west: '毕宿', zui: '觜宿',
        shen: '参宿', jing: '井宿', gui: '鬼宿', liu: '柳宿',
        xing: '星宿', zhang: '张宿', yi: '翼宿', zhen: '轸宿'
      };
      return mansions[starId] || starId;
    }

    animateEvents(time) {
      this.eventMarkers.forEach((em, index) => {
        const pulse = Math.sin(time * 0.002 + index * 0.5) * 0.2 + 1;
        em.balloon.scale.set(pulse, pulse, pulse);
        em.sprite.material.opacity = 0.7 + Math.sin(time * 0.003 + index) * 0.3;
      });
    }

    toggleEvents(visible) {
      this.sceneManager.eventGroup.visible = visible;
    }

    getEventsByMansion(mansionId) {
      return StarData.historicalEvents.filter(e => e.star === mansionId);
    }

    static getAllEvents() {
      return StarData.historicalEvents;
    }
  }

  return EventMarker;
})();
