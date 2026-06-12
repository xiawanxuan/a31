import folium
from folium import plugins
import pandas as pd
import os
import sys
from datetime import datetime

sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from config.settings import CITY_CENTER, MAP_ZOOM, COLORS, OUTPUT_DIR


class TrafficVisualizer:
    def __init__(self, center=CITY_CENTER, zoom_start=MAP_ZOOM):
        self.center = center
        self.zoom_start = zoom_start
        self.output_dir = OUTPUT_DIR
        self.colors = COLORS

    def create_base_map(self):
        m = folium.Map(
            location=self.center,
            zoom_start=self.zoom_start,
            tiles="CartoDB positron",
            control_scale=True
        )

        folium.TileLayer(
            tiles="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
            attr="CartoDB",
            name="浅色系地图"
        ).add_to(m)

        folium.TileLayer(
            tiles="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
            attr="CartoDB",
            name="深色系地图"
        ).add_to(m)

        return m

    def _get_speed_color(self, speed):
        if speed >= 50:
            return self.colors["smooth"]
        elif speed >= 30:
            return self.colors["slow"]
        elif speed >= 20:
            return self.colors["congested"]
        else:
            return self.colors["very_congested"]

    def _get_line_width(self, lanes):
        return max(3, min(8, lanes * 1.5))

    def add_traffic_segments(self, m, df, layer_name="实时交通"):
        feature_group = folium.FeatureGroup(name=layer_name)

        for _, row in df.iterrows():
            start_point = (row["start_lat"], row["start_lon"])
            end_point = (row["end_lat"], row["end_lon"])
            color = self._get_speed_color(row["avg_speed"])
            width = self._get_line_width(row.get("lanes", 4))

            popup_html = f"""
            <div style="font-family: Arial; font-size: 12px; min-width: 150px;">
                <h4 style="margin: 0 0 8px 0; color: #333;">{row['road_name']}</h4>
                <p style="margin: 4px 0;"><strong>速度:</strong> {row['avg_speed']} km/h</p>
                <p style="margin: 4px 0;"><strong>流量:</strong> {row['flow']} 辆/小时</p>
                <p style="margin: 4px 0;"><strong>占有率:</strong> {row['occupancy']}%</p>
                <p style="margin: 4px 0;"><strong>车道数:</strong> {row.get('lanes', 'N/A')}</p>
            </div>
            """

            folium.PolyLine(
                locations=[start_point, end_point],
                color=color,
                weight=width,
                opacity=0.8,
                popup=folium.Popup(popup_html, max_width=300),
                tooltip=f"{row['road_name']}: {row['avg_speed']} km/h"
            ).add_to(feature_group)

        feature_group.add_to(m)
        return m

    def add_prediction_segments(self, m, predictions, df, layer_name="预测交通"):
        feature_group = folium.FeatureGroup(name=layer_name, show=False)

        road_info = {}
        for _, row in df.iterrows():
            road_info[row["road_id"]] = {
                "start_lat": row["start_lat"],
                "start_lon": row["start_lon"],
                "end_lat": row["end_lat"],
                "end_lon": row["end_lon"],
                "lanes": row.get("lanes", 4),
                "road_name": row["road_name"],
            }

        for road_id, pred_data in predictions.items():
            if road_id not in road_info:
                continue

            info = road_info[road_id]
            start_point = (info["start_lat"], info["start_lon"])
            end_point = (info["end_lat"], info["end_lon"])

            avg_pred_speed = sum(pred_data["values"]) / len(pred_data["values"])
            color = self._get_speed_color(avg_pred_speed)
            width = self._get_line_width(info["lanes"])

            times_str = "<br>".join([
                f"{ts.strftime('%H:%M')}: {val} km/h"
                for ts, val in zip(pred_data["timestamps"], pred_data["values"])
            ])

            popup_html = f"""
            <div style="font-family: Arial; font-size: 12px; min-width: 180px;">
                <h4 style="margin: 0 0 8px 0; color: #333;">{info['road_name']} (预测)</h4>
                <p style="margin: 4px 0;"><strong>预测平均速度:</strong> {round(avg_pred_speed, 1)} km/h</p>
                <p style="margin: 4px 0;"><strong>预测方法:</strong> {pred_data['method']}</p>
                <hr style="margin: 8px 0;">
                <p style="margin: 4px 0;"><strong>未来 {len(pred_data['values'])} 个时段:</strong></p>
                <p style="margin: 4px 0; font-size: 11px;">{times_str}</p>
            </div>
            """

            folium.PolyLine(
                locations=[start_point, end_point],
                color=color,
                weight=width,
                opacity=0.6,
                dash_array="10, 10",
                popup=folium.Popup(popup_html, max_width=350),
                tooltip=f"{info['road_name']} 预测: {round(avg_pred_speed, 1)} km/h"
            ).add_to(feature_group)

        feature_group.add_to(m)
        return m

    def add_congestion_markers(self, m, congestion_df, top_n=5):
        feature_group = folium.FeatureGroup(name="拥堵点", show=True)

        top_congested = congestion_df.head(top_n)

        for _, row in top_congested.iterrows():
            mid_lat = (row["start_lat"] + row["end_lat"]) / 2
            mid_lon = (row["start_lon"] + row["end_lon"]) / 2

            icon_color = "red" if row["congestion_level"] in ["congested", "very_congested"] else "orange"

            popup_html = f"""
            <div style="font-family: Arial; font-size: 12px; min-width: 180px;">
                <h4 style="margin: 0 0 8px 0; color: #d32f2f;">⚠️ 拥堵路段</h4>
                <p style="margin: 4px 0;"><strong>路段:</strong> {row['road_name']}</p>
                <p style="margin: 4px 0;"><strong>当前速度:</strong> {row['current_speed']} km/h</p>
                <p style="margin: 4px 0;"><strong>拥堵等级:</strong> {row['congestion_level']}</p>
                <p style="margin: 4px 0;"><strong>当前流量:</strong> {row['current_flow']} 辆/小时</p>
                {'<p style="margin: 4px 0;"><strong>未来预测:</strong> ' + str(row.get('future_congestion', 'N/A')) + '</p>'}
            </div>
            """

            folium.Marker(
                location=[mid_lat, mid_lon],
                icon=folium.Icon(color=icon_color, icon="exclamation-sign", prefix="glyphicon"),
                popup=folium.Popup(popup_html, max_width=300),
                tooltip=f"拥堵: {row['road_name']} - {row['current_speed']} km/h"
            ).add_to(feature_group)

        feature_group.add_to(m)
        return m

    def add_legend(self, m):
        legend_html = """
        <div style="position: fixed; bottom: 30px; left: 30px; z-index: 1000;
                    background-color: white; padding: 12px; border-radius: 8px;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.2); font-family: Arial; font-size: 12px;">
            <h4 style="margin: 0 0 10px 0; color: #333;">交通状态图例</h4>
            <div style="display: flex; align-items: center; margin: 4px 0;">
                <div style="width: 20px; height: 6px; background-color: green; margin-right: 8px;"></div>
                <span>畅通 (≥50 km/h)</span>
            </div>
            <div style="display: flex; align-items: center; margin: 4px 0;">
                <div style="width: 20px; height: 6px; background-color: #CCCC00; margin-right: 8px;"></div>
                <span>缓行 (30-50 km/h)</span>
            </div>
            <div style="display: flex; align-items: center; margin: 4px 0;">
                <div style="width: 20px; height: 6px; background-color: red; margin-right: 8px;"></div>
                <span>拥堵 (20-30 km/h)</span>
            </div>
            <div style="display: flex; align-items: center; margin: 4px 0;">
                <div style="width: 20px; height: 6px; background-color: #8B0000; margin-right: 8px;"></div>
                <span>严重拥堵 (&lt;20 km/h)</span>
            </div>
            <div style="margin-top: 8px; font-size: 10px; color: #666;">
                虚线表示预测数据
            </div>
        </div>
        """
        m.get_root().html.add_child(folium.Element(legend_html))
        return m

    def add_info_panel(self, m, summary):
        info_html = f"""
        <div style="position: fixed; top: 10px; right: 10px; z-index: 1000;
                    background-color: white; padding: 15px; border-radius: 8px;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.2); font-family: Arial; font-size: 13px;
                    min-width: 200px;">
            <h4 style="margin: 0 0 10px 0; color: #333; border-bottom: 2px solid #2196F3; padding-bottom: 5px;">
                交通概览
            </h4>
            <div style="margin: 6px 0;">
                <strong>总路段数:</strong> {summary['total_roads']}
            </div>
            <div style="margin: 6px 0; color: green;">
                <strong>畅通:</strong> {summary['smooth_roads']} 条
            </div>
            <div style="margin: 6px 0; color: #CCCC00;">
                <strong>缓行:</strong> {summary['slow_roads']} 条
            </div>
            <div style="margin: 6px 0; color: red;">
                <strong>拥堵:</strong> {summary['congested_roads']} 条
            </div>
            <div style="margin: 6px 0; color: #8B0000;">
                <strong>严重拥堵:</strong> {summary['very_congested_roads']} 条
            </div>
            <div style="margin: 8px 0; padding-top: 8px; border-top: 1px solid #eee;">
                <strong>拥堵率:</strong> {summary['congestion_rate']}%
            </div>
            <div style="margin: 6px 0;">
                <strong>平均速度:</strong> {summary['avg_speed']} km/h
            </div>
            <div style="margin: 6px 0;">
                <strong>平均流量:</strong> {summary['avg_flow']} 辆/h
            </div>
            <div style="margin-top: 10px; font-size: 10px; color: #999;">
                更新时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
            </div>
        </div>
        """
        m.get_root().html.add_child(folium.Element(info_html))
        return m

    def add_minimap(self, m):
        minimap = plugins.MiniMap()
        m.add_child(minimap)
        return m

    def create_full_map(self, df, predictions=None, congestion_df=None, summary=None):
        m = self.create_base_map()

        m = self.add_traffic_segments(m, df, layer_name="实时交通")

        if predictions is not None:
            m = self.add_prediction_segments(m, predictions, df, layer_name="预测交通")

        if congestion_df is not None:
            m = self.add_congestion_markers(m, congestion_df, top_n=5)

        m = self.add_legend(m)

        if summary is not None:
            m = self.add_info_panel(m, summary)

        m = self.add_minimap(m)

        folium.LayerControl().add_to(m)

        return m

    def save_map(self, m, filename="traffic_map.html"):
        if not os.path.exists(self.output_dir):
            os.makedirs(self.output_dir)

        filepath = os.path.join(self.output_dir, filename)
        m.save(filepath)
        return filepath


if __name__ == "__main__":
    from src.data_fetcher import DataFetcher
    from src.data_preprocessor import DataPreprocessor
    from src.predictor import TrafficPredictor

    fetcher = DataFetcher()
    preprocessor = DataPreprocessor()
    predictor = TrafficPredictor()
    visualizer = TrafficVisualizer()

    print("=== 生成测试数据 ===")
    df = fetcher.fetch_realtime_data()
    print(f"实时数据: {len(df)} 条")

    print("\n=== 数据预处理 ===")
    processed_df = preprocessor.preprocess_pipeline(df, add_rolling=False)

    print("\n=== 交通预测 ===")
    historical_df = fetcher.fetch_historical_data(
        datetime.now() - pd.Timedelta(days=3),
        datetime.now(),
        interval_minutes=30
    )
    historical_processed = preprocessor.preprocess_pipeline(historical_df)
    predictions = predictor.predict_ensemble(historical_processed)

    print("\n=== 拥堵识别 ===")
    congestion_df = predictor.identify_congested_roads(historical_processed, predictions)
    summary = predictor.get_congestion_summary(congestion_df)

    print("\n=== 生成地图 ===")
    traffic_map = visualizer.create_full_map(
        processed_df,
        predictions=predictions,
        congestion_df=congestion_df,
        summary=summary
    )

    filepath = visualizer.save_map(traffic_map, "test_traffic_map.html")
    print(f"地图已保存到: {filepath}")
