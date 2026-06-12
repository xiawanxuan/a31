# 星占分野系统 - 项目开发计划

## 一、项目概述

基于 Three.js + D3.js 构建的中国古代星占分野可视化系统，实现三维天球上的二十八宿、十二次位置标注，以及星占事件与地理分野的联动展示。

### 技术栈
- **3D 渲染**: Three.js r128
- **2D 可视化**: D3.js v7
- **模块化**: ES6 Modules
- **服务端**: Node.js (Express 静态服务)

### 核心功能
1. ✅ 三维天球上标注二十八宿位置
2. ✅ 十二次分区可视化
3. ✅ 点击星宿高亮对应战国诸侯国（分野）地图
4. ✅ 历史星占事件气球标注（如"荧惑守心"）
5. ✅ 天区分层剖切（赤道/黄道/地平坐标系切换）
6. ✅ 星占事件轨迹可视化
7. ✅ 四象（青龙、白虎、朱雀、玄武）边界绘制
8. ✅ 分野地图双向联动（星宿 ↔ 诸侯国）

---

## 二、系统架构

### 模块化设计

```
astronomy-fenye/
├── js/
│   ├── main.js                    # 应用入口，主控制器
│   ├── scene/
│   │   ├── SceneManager.js        # 场景管理（天球、星星、相机、交互）
│   │   └── TwelveDivisions.js     # 十二次分区渲染
│   ├── coordinates/
│   │   └── CoordinateSystem.js    # 坐标系转换与切换动画
│   ├── data/
│   │   └── starData.js            # 星宿数据、分野映射、坐标转换工具
│   ├── fenye/
│   │   └── FenyeSystem.js         # 分野地图（D3.js）与联动逻辑
│   └── events/
│       └── EventMarker.js         # 历史事件气球标注与动画
├── js-bundle/                     # 打包后的单文件版本（可选）
├── index.html                     # 主页面
├── server.js                      # Node.js 静态服务器
└── plan.md                        # 本文档
```

### 模块职责

| 模块 | 职责 | 关键文件 |
|------|------|----------|
| **场景管理** | 天球渲染、星空背景、坐标网格、相机控制、交互检测 | [SceneManager.js](file:///d:/trae3/a31/astronomy-fenye/js/scene/SceneManager.js) |
| **星宿数据** | 二十八宿数据、十二次数据、诸侯国数据、坐标转换公式 | [starData.js](file:///d:/trae3/a31/astronomy-fenye/js/data/starData.js) |
| **分野联动** | D3.js 地图渲染、星宿-诸侯国双向高亮、分野信息展示 | [FenyeSystem.js](file:///d:/trae3/a31/astronomy-fenye/js/fenye/FenyeSystem.js) |
| **事件标注** | 事件气球创建、轨迹绘制、脉冲动画、事件列表 | [EventMarker.js](file:///d:/trae3/a31/astronomy-fenye/js/events/EventMarker.js) |
| **坐标系统** | 赤道/黄道/地平坐标转换、切换动画、网格重建 | [CoordinateSystem.js](file:///d:/trae3/a31/astronomy-fenye/js/coordinates/CoordinateSystem.js) |
| **十二次分区** | 十二次扇区渲染、标签、高亮联动 | [TwelveDivisions.js](file:///d:/trae3/a31/astronomy-fenye/js/scene/TwelveDivisions.js) |

---

## 三、数据模型

### 3.1 二十八宿数据结构

```javascript
{
  id: 'xin',                    // 唯一标识
  name: '心宿',                 // 名称
  fullName: '心月狐',           // 全名（含七曜、动物）
  constellation: '天蝎座',      // 现代星座
  ra: 247.0,                    // 赤经（度）
  dec: -26.5,                   // 赤纬（度）
  magnitude: 1.0,               // 视星等
  description: '...',           // 描述
  fenye: '豫州',                // 分野区域
  state: '宋',                  // 对应诸侯国
  twelve: '大火',               // 所属十二次
  stars: [...]                  // 该宿内恒星明细
}
```

### 3.2 十二次数据结构

```javascript
{
  id: 'dahuo',
  name: '大火',
  startRA: 220,                 // 起始赤经
  endRA: 255,                   // 结束赤经
  description: '东方苍龙，氐、房、心三宿属焉',
  fenye: '豫州',
  state: '宋',
  color: '#ff6666'
}
```

### 3.3 诸侯国 GeoJSON

```javascript
{
  type: 'Feature',
  properties: { 
    id: 'qin', 
    name: '秦', 
    region: '雍州', 
    color: '#8B4513' 
  },
  geometry: {
    type: 'Polygon',
    coordinates: [[[经度, 纬度], ...]]
  }
}
```

### 3.4 历史星占事件

```javascript
{
  id: 'yinghuo_shouxin',
  name: '荧惑守心',
  date: '公元前212年',
  dynasty: '秦始皇三十五年',
  star: 'xin',                  // 关联星宿ID
  ra: 247.0,
  dec: -26.5,
  planet: 'yinghuo',            // 关联行星（荧惑=火星）
  trajectory: [{ra, dec}, ...], // 运行轨迹
  description: '...',
  significance: '...',          // 星占意义
  historicalRecord: '《史记》...'
}
```

---

## 四、功能实现详情

### 4.1 三维天球与星宿渲染

**核心逻辑**: [SceneManager.js](file:///d:/trae3/a31/astronomy-fenye/js/scene/SceneManager.js#L824-L852)

- 天球半径: 100 单位
- 星星大小: 基于视星等 `max(0.8, 4 - magnitude * 0.8)`
- 星星颜色: 
  - 视星等 < 1: 暖白色 `0xfff0e0`
  - 视星等 < 2: 黄白色 `0xfffff0`
  - 其他: 纯白色 `0xffffff`
- 背景星星: 2000 颗随机分布
- 交互: Raycaster 射线检测点击/悬停

### 4.2 坐标系切换

**核心逻辑**: [CoordinateSystem.js](file:///d:/trae3/a31/astronomy-fenye/js/coordinates/CoordinateSystem.js#L20-L79)

支持三种坐标系平滑过渡动画（800ms）:

1. **赤道坐标系** (默认)
   - 网格: 红色赤道、蓝色经纬度线
   - 极点: 赤北极、赤南极

2. **黄道坐标系**
   - 网格: 黄色黄道、黄道经纬度线
   - 黄道倾斜: 23.4397°（黄赤交角）
   - 十二星宫标签

3. **地平坐标系**
   - 网格: 绿色地平线、方位/高度线
   - 方向标签: 东南西北、天顶

### 4.3 天区分层剖切

**核心逻辑**: [SceneManager.js](file:///d:/trae3/a31/astronomy-fenye/js/scene/SceneManager.js#L137-L221)

- 使用 Three.js `Plane` 裁剪平面
- 支持三种剖切平面: 赤道面、黄道面、地平面
- 可调节参数:
  - 剖切深度 (`constant`)
  - 剖切方向 (`normal.negate()`)
  - 自定义旋转角度
- 可视化: 半透明平面 + 法线箭头

### 4.4 分野地图联动

**核心逻辑**: [FenyeSystem.js](file:///d:/trae3/a31/astronomy-fenye/js/fenye/FenyeSystem.js)

**双向联动**:
```
天球点击星宿 → 高亮对应诸侯国 → 显示分野信息
       ↑                            ↓
       └──────── 相机聚焦 ─────────┘
       
地图点击诸侯国 → 高亮对应星宿 → 显示关联信息
       ↑                            ↓
       └────── 十二次联动 ──────────┘
```

**两种地图模式**:
1. **简版**: 圆形节点 + 连接关系
2. **详细版**: D3.js GeoMercator 投影 + 诸侯国多边形

### 4.5 事件气球标注

**核心逻辑**: [EventMarker.js](file:///d:/trae3/a31/astronomy-fenye/js/events/EventMarker.js#L46-L185)

**气球结构**:
- 球体 (SphereGeometry, 椭圆缩放 1:1.3:1)
- 辉光效果 (放大的透明球体)
- 高光点 (内部白色小球)
- 连接线 (贝塞尔曲线 TubeGeometry)
- 标签 (Canvas 纹理 Sprite)

**动画效果**:
- 脉冲缩放: `sin(time) * 0.15 + 1`
- 上下浮动: `sin(time) * 0.5`
- 透明度呼吸
- 轨迹线显示行星运行路径

### 4.6 四象边界

**核心逻辑**: [SceneManager.js](file:///d:/trae3/a31/astronomy-fenye/js/scene/SceneManager.js#L563-L657)

| 四象 | 颜色 | 星宿 | 方位 |
|------|------|------|------|
| 东方苍龙 | 绿色 `0x44ff88` | 角亢氐房心尾箕 | 东 |
| 北方玄武 | 蓝色 `0x4488ff` | 斗牛女虚危室壁 | 北 |
| 西方白虎 | 白色 `0xffffff` | 奎娄胃昴毕觜参 | 西 |
| 南方朱雀 | 红色 `0xff4444` | 井鬼柳星张翼轸 | 南 |

使用 CatmullRom 曲线平滑连接各宿主星，形成闭合边界。

---

## 五、已完成修复与优化

### 2026-06-12 修复列表

| # | 问题 | 影响 | 修复方案 |
|---|------|------|----------|
| 1 | `createFourSymbols()` 在星星创建前调用，导致四象边界无法绘制 | 四象边界不显示 | 调整调用顺序到 `createStars()` 之后 |
| 2 | 坐标系切换动画只移动星星 mesh，不移动 label | 切换坐标系后标签位置错误 | 在 `CoordinateSystem.js` 中添加 label 动画逻辑 |
| 3 | Sprite label 缺少 userData 标识，无法可靠匹配对应星宿 | 标签动画可能错位 | 在 `addStarLabel()` 中添加 `{ra, dec, isLabel: true}` |
| 4 | Canvas `roundRect()` API 兼容性问题（较新浏览器特性） | 旧浏览器事件标签不显示 | 添加 `drawRoundRect()` 兼容方法，使用 quadraticCurveTo 手动绘制 |
| 5 | 点击星宿/诸侯国时相机无聚焦动效 | 交互体验不足 | 添加 `focusOnMansion()` 和 `animateCamera()` 缓动动画 |

---

## 六、后续开发计划

### 6.1 短期优化 (优先级: 高)

- [ ] **增强事件轨迹动画**: 添加行星沿轨迹运动的动画
- [ ] **时间轴控制**: 支持按时间轴浏览不同历史时期的星象
- [ ] **搜索功能**: 支持按星宿名、诸侯国名、事件名搜索
- [ ] **性能优化**: 使用 BufferGeometry + Points 替代 Mesh 渲染大量星星
- [ ] **移动端适配**: 触摸手势支持、响应式布局

### 6.2 中期功能 (优先级: 中)

- [ ] **更多星占事件**: 补充《史记·天官书》等史料中的星占记录
- [ ] **行星实时位置**: 计算五大行星（岁星、荧惑、镇星、太白、辰星）的实时位置
- [ ] **月相显示**: 月相变化动画
- [ ] **分野对比**: 对比不同朝代（汉、唐、宋）的分野理论差异
- [ ] **导出功能**: 导出星图截图、分野对照表

### 6.3 长期拓展 (优先级: 低)

- [ ] **VR 模式**: WebXR 虚拟现实支持
- [ ] **星占推演**: 输入日期自动推演星象及对应分野解释
- [ ] **多语言**: 支持中文、英文、文言文切换
- [ ] **数据编辑**: 可视化编辑星宿位置、分野映射
- [ ] **API 服务**: 提供后端 API 支持星占数据查询

---

## 七、使用说明

### 7.1 启动项目

```bash
# 方式1: 使用 Node.js
cd astronomy-fenye
node server.js

# 方式2: 使用 PowerShell 脚本
.\start-server.ps1
```

访问: `http://localhost:3000/`

### 7.2 操作指南

| 操作 | 效果 |
|------|------|
| 鼠标拖拽 | 旋转天球 |
| 滚轮 | 缩放视角 |
| 点击星宿 | 高亮对应诸侯国 + 相机聚焦 |
| 点击诸侯国 | 高亮对应星宿 |
| 点击事件 | 显示事件详情 + 高亮关联星宿 |
| 坐标系按钮 | 切换赤道/黄道/地平坐标系（带动画） |
| 剖切控制 | 开启/关闭剖切，调整剖切平面 |
| 图层按钮 | 显示/隐藏二十八宿、星座连线、十二次、网格、事件 |

### 7.3 关键交互点

- **荧惑守心**: 点击事件列表中的"荧惑守心"，观察火星在心宿附近的轨迹
- **分野联动**: 点击天球上的"心宿"，观察分野地图中"宋国"的高亮
- **坐标系切换**: 点击"黄道坐标系"，观察星星和标签的平滑过渡动画
- **剖切效果**: 开启剖切后拖动"剖切深度"滑块，观察天球剖切效果

---

## 八、坐标转换公式

### 8.1 赤道坐标 → 三维向量

```javascript
function raDecToVector3(ra, dec, radius) {
  const raRad = ra * π / 180;
  const decRad = dec * π / 180;
  return {
    x: radius * cos(decRad) * cos(raRad),
    y: radius * sin(decRad),
    z: radius * cos(decRad) * sin(raRad)
  };
}
```

### 8.2 赤道 → 黄道坐标转换

```javascript
// 黄赤交角 ε = 23.4397°
sin(β) = sin(δ)cos(ε) - cos(δ)sin(ε)sin(α)
cos(β) = √(1 - sin²(β))
sin(λ) = [cos(δ)sin(α)cos(ε) + sin(δ)sin(ε)] / cos(β)
cos(λ) = cos(α)cos(δ) / cos(β)
```

### 8.3 赤道 → 地平坐标转换

```javascript
// 时角 HA = LST - α
sin(h) = sin(φ)sin(δ) + cos(φ)cos(δ)cos(HA)
cos(A) = [sin(δ) - sin(φ)sin(h)] / [cos(φ)cos(h)]
sin(A) = -cos(δ)sin(HA) / cos(h)
```

---

## 九、参考资料

### 9.1 古代文献
- 《史记·天官书》 - 司马迁
- 《汉书·天文志》 - 班固
- 《晋书·天文志》
- 《开元占经》 - 瞿昙悉达
- 《步天歌》 - 王希明

### 9.2 现代参考
- 中国古代星占学（陈遵妫）
- 中国天文学史（席泽宗）
- Three.js 官方文档: https://threejs.org/docs/
- D3.js 官方文档: https://d3js.org/

---

## 十、版本历史

| 版本 | 日期 | 说明 |
|------|------|------|
| v1.0.0 | 2026-06-12 | 初版完成，核心功能全部实现 |
| v1.0.1 | 2026-06-12 | 修复四象边界、label动画、roundRect兼容问题 |

---

**项目维护者**: 星占分野系统开发团队  
**最后更新**: 2026-06-12
