import { historicalEvents, raDecToVector3, planets } from '../data/starData.js';

export class EventMarker {
  constructor(sceneManager, eventListContainerId) {
    this.sceneManager = sceneManager;
    this.eventListContainer = document.getElementById(eventListContainerId);
    this.eventMarkers = [];
    this.trajectoryLines = [];
    this.currentHighlightedEvent = null;
    this.onEventClick = null;

    this.init();
  }

  init() {
    this.createEventList();
  }

  createEventMarkers() {
    historicalEvents.forEach(event => {
      this.addEventBalloon(event);
    });
  }

  createBalloonShape(width, height) {
    const shape = new THREE.Shape();
    const w = width;
    const h = height;
    const tipH = h * 0.2;

    shape.moveTo(0, -h / 2 + tipH);
    shape.quadraticCurveTo(w * 0.05, -h / 2, w / 4, -h / 2 + tipH * 0.3);
    shape.quadraticCurveTo(w / 3, -h / 2 + tipH * 0.6, w / 2, -h / 2 + tipH * 0.8);
    shape.quadraticCurveTo(w * 2 / 3, -h / 2 + tipH * 0.6, w * 3 / 4, -h / 2 + tipH * 0.3);
    shape.quadraticCurveTo(w * 0.95, -h / 2, w, -h / 2 + tipH);
    shape.quadraticCurveTo(w * 1.05, 0, w, h / 2 - tipH);
    shape.quadraticCurveTo(w * 0.95, h / 2, w * 3 / 4, h / 2);
    shape.quadraticCurveTo(w / 2, h / 2 + tipH * 0.3, w / 2, h / 2 + tipH * 0.15);
    shape.quadraticCurveTo(w / 2, h / 2 + tipH * 0.3, w / 4, h / 2);
    shape.quadraticCurveTo(w * 0.05, h / 2, 0, h / 2 - tipH);
    shape.quadraticCurveTo(-w * 0.05, 0, 0, -h / 2 + tipH);

    return shape;
  }

  addEventBalloon(event) {
    const group = new THREE.Group();
    group.userData = { event };

    const pos = raDecToVector3(event.ra, event.dec, this.sceneManager.sphereRadius + 5);

    const balloonGeo = new THREE.SphereGeometry(2.5, 16, 16);
    balloonGeo.scale(1, 1.3, 1);

    const planetInfo = event.planet ? planets[event.planet] : null;
    const balloonColor = planetInfo ? planetInfo.color : 0xff5555;

    const balloonMat = new THREE.MeshBasicMaterial({
      color: balloonColor,
      transparent: true,
      opacity: 0.75
    });
    const balloon = new THREE.Mesh(balloonGeo, balloonMat);
    balloon.position.copy(pos);
    group.add(balloon);

    const glowGeo = new THREE.SphereGeometry(4, 16, 16);
    glowGeo.scale(1, 1.3, 1);
    const glowMat = new THREE.MeshBasicMaterial({
      color: balloonColor,
      transparent: true,
      opacity: 0.2
    });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    balloon.add(glow);

    const innerGeo = new THREE.SphereGeometry(1.2, 12, 12);
    const innerMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.4
    });
    const inner = new THREE.Mesh(innerGeo, innerMat);
    inner.position.set(0, 1, 0.5);
    balloon.add(inner);

    const direction = pos.clone().normalize();
    const stemLength = 6;
    const stemStart = pos.clone().add(direction.clone().multiplyScalar(-2.5));
    const stemEnd = pos.clone().add(direction.clone().multiplyScalar(-2.5 - stemLength));

    const stemCurve = new THREE.QuadraticBezierCurve3(
      stemStart,
      stemStart.clone().add(new THREE.Vector3(
        (Math.random() - 0.5) * 3,
        (Math.random() - 0.5) * 3,
        (Math.random() - 0.5) * 3
      )),
      stemEnd
    );
    const stemGeo = new THREE.TubeGeometry(stemCurve, 12, 0.15, 6, false);
    const stemMat = new THREE.MeshBasicMaterial({
      color: balloonColor,
      transparent: true,
      opacity: 0.6
    });
    const stem = new THREE.Mesh(stemGeo, stemMat);
    group.add(stem);

    const knotGeo = new THREE.SphereGeometry(0.5, 8, 8);
    const knotMat = new THREE.MeshBasicMaterial({
      color: balloonColor,
      transparent: true,
      opacity: 0.8
    });
    const knot = new THREE.Mesh(knotGeo, knotMat);
    knot.position.copy(stemStart);
    group.add(knot);

    const labelPos = pos.clone().multiplyScalar(1.15);
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 512;
    canvas.height = 160;

    context.fillStyle = 'rgba(0, 0, 0, 0)';
    context.fillRect(0, 0, canvas.width, canvas.height);

    const boxX = 20;
    const boxY = 10;
    const boxW = canvas.width - 40;
    const boxH = canvas.height - 20;
    context.fillStyle = 'rgba(30, 10, 10, 0.75)';
    context.strokeStyle = `#${balloonColor.toString(16).padStart(6, '0')}`;
    context.lineWidth = 2;
    this.drawRoundRect(context, boxX, boxY, boxW, boxH, 8);
    context.fill();
    context.stroke();

    context.font = 'bold 30px SimHei, Microsoft YaHei, sans-serif';
    context.fillStyle = `#${balloonColor.toString(16).padStart(6, '0')}`;
    context.shadowColor = `#${balloonColor.toString(16).padStart(6, '0')}80`;
    context.shadowBlur = 10;
    context.textAlign = 'center';
    context.fillText(event.name, canvas.width / 2, boxY + 48);

    context.font = '20px SimHei, Microsoft YaHei, sans-serif';
    context.fillStyle = '#ffcc88';
    context.shadowBlur = 5;
    context.fillText(event.date, canvas.width / 2, boxY + 78);

    if (planetInfo) {
      context.font = '16px SimHei, Microsoft YaHei, sans-serif';
      context.fillStyle = '#aaaacc';
      context.shadowBlur = 0;
      context.fillText(`${planetInfo.name}（${planetInfo.symbol}）`, canvas.width / 2, boxY + 105);
    }

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false
    });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.position.copy(labelPos);
    sprite.scale.set(28, 9, 1);
    group.add(sprite);

    if (event.trajectory && event.trajectory.length > 0) {
      this.addTrajectory(group, event, balloonColor);
    }

    this.sceneManager.eventGroup.add(group);
    this.eventMarkers.push({ group, balloon, glow, inner, event, sprite, knot });

    balloon.userData = { event, noClipping: true };
    glow.userData = { noClipping: true };
    knot.userData = { event, noClipping: true };
    this.sceneManager.eventClickables.push(balloon);
    this.sceneManager.eventClickables.push(knot);

    return group;
  }

  addTrajectory(group, event, color) {
    const trajectoryPoints = event.trajectory.map(p =>
      raDecToVector3(p.ra, p.dec, this.sceneManager.sphereRadius + 2)
    );

    if (trajectoryPoints.length < 2) return;

    const curve = new THREE.CatmullRomCurve3(trajectoryPoints);
    const curvePoints = curve.getPoints(80);
    const trajectoryGeo = new THREE.BufferGeometry().setFromPoints(curvePoints);
    const trajectoryMat = new THREE.LineBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.5
    });
    const trajectoryLine = new THREE.Line(trajectoryGeo, trajectoryMat);
    trajectoryLine.userData = { noClipping: true };
    group.add(trajectoryLine);

    this.trajectoryLines.push({ line: trajectoryLine, eventId: event.id });
  }

  drawRoundRect(ctx, x, y, w, h, r) {
    if (ctx.roundRect) {
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, r);
    } else {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r);
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
    }
  }

  createEventList() {
    if (!this.eventListContainer) return;

    historicalEvents.forEach(event => {
      const item = document.createElement('div');
      item.className = 'event-item';
      item.dataset.eventId = event.id;

      const planetInfo = event.planet ? planets[event.planet] : null;
      const planetTag = planetInfo
        ? `<span style="color:#${planetInfo.color.toString(16).padStart(6, '0')};margin-left:6px;font-size:11px;">${planetInfo.name}</span>`
        : '';

      item.innerHTML = `
        <div class="event-name">${event.name}${planetTag}</div>
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
      eventMarker.glow.material.opacity = 0.4;
      eventMarker.knot.material.color.setHex(0xffff00);
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
      const planetInfo = em.event.planet ? planets[em.event.planet] : null;
      const originalColor = planetInfo ? planetInfo.color : 0xff5555;

      em.balloon.scale.set(1, 1, 1);
      em.balloon.material.color.setHex(originalColor);
      em.glow.material.opacity = 0.2;
      em.knot.material.color.setHex(originalColor);
    });

    this.eventListContainer.querySelectorAll('.event-item').forEach(item => {
      item.style.background = '';
      item.style.borderColor = '';
    });

    this.currentHighlightedEvent = null;
  }

  focusOnEvent(eventId) {
    const event = historicalEvents.find(e => e.id === eventId);
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
      const pulse = Math.sin(time * 0.002 + index * 0.8) * 0.15 + 1;
      const float = Math.sin(time * 0.001 + index * 1.2) * 0.5;

      em.balloon.scale.set(pulse, pulse * 1.1, pulse);
      em.balloon.position.y = em.event.ra ? float : 0;

      em.glow.scale.set(
        1 + Math.sin(time * 0.003 + index) * 0.1,
        1 + Math.sin(time * 0.003 + index) * 0.1,
        1 + Math.sin(time * 0.003 + index) * 0.1
      );
      em.glow.material.opacity = 0.15 + Math.sin(time * 0.004 + index) * 0.1;

      if (em.inner) {
        em.inner.material.opacity = 0.3 + Math.sin(time * 0.005 + index * 0.7) * 0.2;
      }

      em.sprite.material.opacity = 0.7 + Math.sin(time * 0.003 + index) * 0.3;
    });
  }

  toggleEvents(visible) {
    this.sceneManager.eventGroup.visible = visible;
  }

  getEventsByMansion(mansionId) {
    return historicalEvents.filter(e => e.star === mansionId);
  }

  static getAllEvents() {
    return historicalEvents;
  }
}
