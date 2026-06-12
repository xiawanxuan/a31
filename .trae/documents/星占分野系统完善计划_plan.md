# 星占分野系统完善计划

## 一、项目现状分析

### 1.1 已有代码结构
```
astronomy-fenye/
├── index.html                    # 主页面，含 UI 控制面板
├── server.js                     # 本地静态服务器
└── js/
    ├── main.js                   # 应用主入口，协调各模块
    ├── scene/
    │   ├── SceneManager.js       # 三维场景管理（天球、相机、光照、交互）
    │   └── TwelveDivisions.js    # 十二次分区可视化
    ├── data/
    │   └── starData.js           # 星宿数据 + 坐标转换工具函数
    ├── fenye/
    │   └── FenyeSystem.js        # 分野地图（D3）+ 星宿-诸侯国联动
    ├── coordinates/
    │   └── CoordinateSystem.js   # 坐标系管理（赤道/黄道/地平）
    └── events/
        └── EventMarker.js        # 历史事件气球标注
```

### 1.2 已实现功能
| 模块 | 功能状态 | 说明 |
|------|---------|------|
| 三维天球 | ✅ 基础完整 | 天球外壳、2000颗背景星、鼠标旋转/缩放 |
| 二十八宿 | ✅ 已实现 | 28宿主星（球体+光晕+标签），按视星等着色 |
| 十二次分区 | ✅ 已实现 | 12次球面扇形区域 + 彩色边框 + 标签 |
| 坐标网格 | ✅ 三套完整 | 赤道（红）、黄道（金）、地平（绿），各自带极/方向标签 |
| 坐标系切换 | ✅ 已实现 | 三套网格显隐切换 + 剖切平面随坐标系旋转 |
| 分野地图 | ✅ D3 已实现 | 15个战国诸侯国圆形节点，悬停/点击联动 |
| 星宿-分野联动 | ✅ 双向 | 点击星宿高亮诸侯国，反之亦然 |
| 历史事件 | ✅ 气球标注 | 6个事件（荧惑守心、参星见等），带脉冲动画 + 侧边列表 |
| 分层剖切 | ⚠️ 基础可用 | 单平面剖切，支持开关、深度、Y轴旋转 |

### 1.3 需完善/增强的方面
1. **星宿渲染增强**：当前每宿仅显示单颗主星，需渲染每宿的多颗子星（角宿一、角宿二等）并用连线形成星座图形
2. **剖切系统增强**：当前仅支持单个剖切平面沿 Y 轴旋转，需支持按坐标系平面剖切（赤道面、黄道面、地平面各自剖切），并提供剖切方向选择
3. **分野地图增强**：当前为简化圆形节点，需使用 D3 geo 绘制战国七雄+主要诸侯国真实地理轮廓
4. **事件气球增强**：增加气球连接线动画、弹出信息面板、荧惑守心等事件的"行星运行轨迹"可视化
5. **交互流畅度优化**：OrbitControls 替换手写鼠标控制、增加星宿选中动画、减少标签重叠

---

## 二、详细修改方案

### 模块 1：星宿数据与渲染增强 (starData.js + SceneManager.js)

**文件**：
- [starData.js](file:///d:/trae3/a31/astronomy-fenye/js/data/starData.js)
- [SceneManager.js](file:///d:/trae3/a31/astronomy-fenye/js/scene/SceneManager.js)

**改动内容**：
1. `starData.js`：补充每宿子星数据的赤经赤纬（当前 `stars` 数组已有但未使用），增加 `getConstellationLines(mansionId)` 函数返回每宿内部连线拓扑
2. `SceneManager.js`：
   - 新增 `createMansionConstellation(mansion)` 方法：渲染每宿多颗子星 + 子星之间连线（LineSegments）
   - 新增 `constellationGroup` 容器管理所有星座图形
   - 重写 `createStars()`，从渲染单主星改为渲染完整星座
   - 主星（mansion 本身）用较大球体高亮，子星用较小 Points
   - `toggleLayer` 增加 `'constellation'` 图层开关

### 模块 2：剖切系统重构 (SceneManager.js + main.js)

**文件**：
- [SceneManager.js](file:///d:/trae3/a31/astronomy-fenye/js/scene/SceneManager.js)
- [main.js](file:///d:/trae3/a31/astronomy-fenye/js/main.js)
- [index.html](file:///d:/trae3/a31/astronomy-fenye/index.html)

**改动内容**：
1. `SceneManager.js`：
   - 重构剖切平面管理：支持三种基础剖切平面（赤道面 normal(0,0,1)、黄道面 normal(0,-sinε,cosε)、地平面 normal(0,1,0)）
   - 新增 `setClippingPlaneType(type)` 方法：`'equatorial' | 'ecliptic' | 'horizontal' | 'custom'`
   - 剖切平面可视化改为半透明磁盘（DiskGeometry），带网格线，更直观
   - 剖切后的边缘高亮显示
2. `index.html`：
   - 「天区分层剖切」面板增加：剖切平面类型选择按钮组（赤道面/黄道面/地平面/自定义）
   - 增加剖切方向切换（保留前半球 / 保留后半球）
3. `main.js`：
   - 新增剖切平面类型切换事件绑定
   - 剖切深度滑块范围根据坐标系动态调整

### 模块 3：分野地图增强 — D3 Geo 战国地图 (FenyeSystem.js + starData.js)

**文件**：
- [FenyeSystem.js](file:///d:/trae3/a31/astronomy-fenye/js/fenye/FenyeSystem.js)
- [starData.js](file:///d:/trae3/a31/astronomy-fenye/js/data/starData.js)
- [index.html](file:///d:/trae3/a31/astronomy-fenye/index.html)

**改动内容**：
1. `starData.js`：
   - 新增 `warringStatesGeoJSON` 常量：战国七雄（秦、楚、齐、燕、赵、魏、韩）+ 鲁、宋、卫、郑、周、吴、越、晋等主要诸侯国的简化 GeoJSON 多边形（经纬度坐标，大致反映地理分布）
2. `FenyeSystem.js`：
   - 重写 `createFenyeMap()`：使用 `d3.geoMercator()` 投影 + `d3.geoPath()` 渲染诸侯国填充多边形
   - 诸侯国填充色沿用 `statesMap.color`，边框加描边
   - 每个 polygon 绑定 mouseover/mouseout/click 事件，保持原有联动逻辑
   - 国名标签放置在多边形质心（`path.centroid`）
   - 增加「简版/详细版」地图切换按钮
3. `index.html`：
   - `#fenye-map` 高度从 250px 增大到 320px 以容纳详细地图

### 模块 4：事件标注增强 — 行星轨迹与信息面板 (EventMarker.js + starData.js)

**文件**：
- [EventMarker.js](file:///d:/trae3/a31/astronomy-fenye/js/events/EventMarker.js)
- [starData.js](file:///d:/trae3/a31/astronomy-fenye/js/data/starData.js)
- [index.html](file:///d:/trae3/a31/astronomy-fenye/index.html)

**改动内容**：
1. `starData.js`：
   - 为 `historicalEvents` 中涉及行星的事件（如荧惑守心=火星）增加 `planet` 字段和 `trajectory` 数组（行星在该事件前后一段时间内的赤经赤纬轨迹点）
   - 新增 `planets` 常量：五行星（木火土金水）的基本数据
2. `EventMarker.js`：
   - 新增 `createPlanetTrajectory(event)`：使用 TubeGeometry 或 Line 渲染行星运行轨迹，颜色按行星（荧惑=火星=红色，岁星=木星=青色等）
   - 新增 `showEventDetail(event)`：在三维场景中事件位置附近弹出浮动信息面板（CSS2DRenderer 或 Sprite + Canvas 纹理），包含事件名、时间、描述
   - 气球点击时：相机平滑飞行到事件位置 + 轨迹淡入显示 + 详细面板弹出
   - 事件列表侧边栏增加「查看轨迹」按钮
3. `index.html`：
   - 面板新增「事件详情」展示区域（在星宿信息下方）

### 模块 5：整体交互优化与 OrbitControls 集成 (SceneManager.js + index.html)

**文件**：
- [SceneManager.js](file:///d:/trae3/a31/astronomy-fenye/js/scene/SceneManager.js)
- [index.html](file:///d:/trae3/a31/astronomy-fenye/index.html)

**改动内容**：
1. `SceneManager.js`：
   - 引入 `THREE.OrbitControls`（从 CDN 或内联简化版）替换手写鼠标控制，支持阻尼惯性、平移限制、缩放范围
   - 新增 `flyToPosition(targetRA, targetDec, duration)`：使用 tween 动画使相机平滑飞行到目标星宿方向
   - 星宿选中时：增加缩放呼吸动画（scale 从 1→2.5→1.5 循环）+ 光晕强度脉冲
   - Sprite 标签增加按距离自动缩放/透明度调整，减少远处标签重叠遮挡
2. `index.html`：
   - 增加加载 Three.js 的 OrbitControls 插件脚本（CDN）
   - UI 小调整：面板标题图标、按钮 hover 效果优化

### 模块 6：模块完整性检查与导出

**文件**：
- 所有 JS 模块

**改动内容**：
1. 确保每个模块都有清晰的 `export` 接口和静态工具方法
2. `main.js` 中对各模块调用统一错误兜底（try/catch）
3. 检查模块间依赖是否清晰，避免循环依赖

---

## 三、文件修改清单

| 文件 | 修改类型 | 优先级 |
|------|---------|--------|
| `js/data/starData.js` | 修改（补充子星、GeoJSON、行星轨迹） | P0 |
| `js/scene/SceneManager.js` | 修改（星座渲染、OrbitControls、剖切重构、flyTo） | P0 |
| `js/fenye/FenyeSystem.js` | 修改（D3 Geo 地图） | P1 |
| `js/events/EventMarker.js` | 修改（行星轨迹、详情面板） | P1 |
| `js/main.js` | 修改（新控制事件绑定、flyTo 调用） | P0 |
| `index.html` | 修改（UI 控件扩展、OrbitControls 引入） | P0 |
| `js/coordinates/CoordinateSystem.js` | 小改（配合剖切系统） | P2 |
| `js/scene/TwelveDivisions.js` | 小改（剖切平面联动） | P2 |

---

## 四、潜在风险与处理

| 风险 | 影响 | 处理方案 |
|------|------|---------|
| 简化版 GeoJSON 诸侯国形状不准确 | P2 分野地图视觉 | 采用经纬度近似边界，明确为示意图，附说明 |
| OrbitControls 与现有手写控制冲突 | P0 交互 | 完全替换手写控制，测试点击/悬停 raycast 是否正常 |
| 多子星 + 连线 + 轨迹 导致性能下降 | P1 帧率 | 子星使用 Points（非 Mesh），连线使用 BufferGeometry，限制单次渲染对象数 |
| 标签重叠严重 | P1 可读性 | 实现基于视锥体剔除 + 距离 LOD 的标签显隐 |
| CDN 资源不可用 | P0 运行 | 保留 server.js 本地托管，同时 CDN 失败时给出提示 |

---

## 五、验证步骤

1. **启动**：运行 `start-server.ps1` 或 `node server.js`，访问 `http://localhost:3000/`
2. **星宿渲染**：打开"二十八宿"图层，可见每宿有主星+多颗子星+连线构成的星座图形
3. **分野联动**：点击天球上任意星宿 → 侧边 D3 地图对应诸侯国高亮闪烁 + 信息更新；点击地图诸侯国 → 天球对应星宿高亮
4. **坐标系切换**：依次点击赤道/黄道/地平 → 天球网格颜色、极点、方向标签正确切换
5. **剖切系统**：开启剖切 → 选择赤道面/黄道面/地平面 → 调整深度滑块 → 天球正确剖切并显示半透明剖切平面
6. **事件标注**：打开"星占事件"图层 → 可见红色脉冲气球 → 点击气球 → 相机飞向事件、显示行星轨迹、弹出详情；点击侧边事件列表 → 相同效果
7. **交互**：鼠标拖拽旋转有惯性阻尼、滚轮缩放平滑、点击星宿有呼吸动画
8. **控制台**：无 JS 报错，FPS 稳定在 30+
