import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from config.settings import ROAD_SEGMENTS, DATA_DIR


class DataFetcher:
    def __init__(self):
        self.road_segments = ROAD_SEGMENTS
        self.data_dir = DATA_DIR

    def fetch_realtime_data(self, timestamp=None):
        if timestamp is None:
            timestamp = datetime.now()

        data = []
        for road in self.road_segments:
            base_flow, avg_speed, occupancy = self._simulate_traffic(road, timestamp)
            data.append({
                "road_id": road["id"],
                "road_name": road["name"],
                "timestamp": timestamp,
                "flow": base_flow,
                "avg_speed": avg_speed,
                "occupancy": occupancy,
                "lanes": road["lanes"],
                "start_lat": road["start"][0],
                "start_lon": road["start"][1],
                "end_lat": road["end"][0],
                "end_lon": road["end"][1],
            })

        return pd.DataFrame(data)

    def _simulate_traffic(self, road, timestamp):
        hour = timestamp.hour
        minute = timestamp.minute
        day_of_week = timestamp.weekday()

        is_weekday = day_of_week < 5

        morning_peak = 0
        if 7 <= hour <= 9:
            morning_peak = 1 - abs(hour * 60 + minute - 8 * 60) / 120
            morning_peak = max(0, morning_peak)

        evening_peak = 0
        if 17 <= hour <= 19:
            evening_peak = 1 - abs(hour * 60 + minute - 18 * 60) / 120
            evening_peak = max(0, evening_peak)

        midday = 0
        if 11 <= hour <= 13:
            midday = 0.5 - 0.5 * abs(hour * 60 + minute - 12 * 60) / 120
            midday = max(0, midday)

        night_factor = 1.0
        if hour < 6 or hour >= 22:
            night_factor = 0.3
        elif 6 <= hour < 7:
            night_factor = 0.3 + 0.7 * (hour - 6 + minute / 60)

        weekend_factor = 0.7 if not is_weekday else 1.0

        peak_factor = max(morning_peak, evening_peak, midday)
        base_flow = 200 + 800 * peak_factor
        base_flow *= night_factor * weekend_factor

        random_factor = 0.85 + np.random.random() * 0.3
        flow = int(base_flow * random_factor * road["lanes"] / 6)

        speed_base = 60
        congestion_factor = peak_factor * 0.6
        avg_speed = speed_base * (1 - congestion_factor * 0.7)
        avg_speed *= night_factor
        avg_speed = max(5, min(80, avg_speed + np.random.normal(0, 5)))

        occupancy = 100 * (flow / road["lanes"]) / 150
        occupancy = max(0, min(100, occupancy + np.random.normal(0, 5)))

        return int(flow), round(avg_speed, 1), round(occupancy, 1)

    def fetch_historical_data(self, start_time, end_time, interval_minutes=5):
        timestamps = []
        current = start_time
        while current <= end_time:
            timestamps.append(current)
            current += timedelta(minutes=interval_minutes)

        all_data = []
        for ts in timestamps:
            df = self.fetch_realtime_data(ts)
            all_data.append(df)

        return pd.concat(all_data, ignore_index=True)

    def load_offline_data(self, filename):
        filepath = os.path.join(self.data_dir, filename)
        if not os.path.exists(filepath):
            raise FileNotFoundError(f"数据文件不存在: {filepath}")

        df = pd.read_csv(filepath)
        df["timestamp"] = pd.to_datetime(df["timestamp"])
        return df

    def save_data(self, df, filename):
        if not os.path.exists(self.data_dir):
            os.makedirs(self.data_dir)

        filepath = os.path.join(self.data_dir, filename)
        df.to_csv(filepath, index=False, encoding="utf-8-sig")
        return filepath

    def generate_sample_data(self, days=7, interval_minutes=5):
        end_time = datetime.now()
        start_time = end_time - timedelta(days=days)
        df = self.fetch_historical_data(start_time, end_time, interval_minutes)
        filename = f"historical_data_{days}days.csv"
        self.save_data(df, filename)
        return df, filename


if __name__ == "__main__":
    fetcher = DataFetcher()
    print("=== 实时数据获取测试 ===")
    realtime_df = fetcher.fetch_realtime_data()
    print(realtime_df.head())
    print(f"\n共获取到 {len(realtime_df)} 条路段数据")

    print("\n=== 生成历史数据 ===")
    historical_df, filename = fetcher.generate_sample_data(days=1, interval_minutes=30)
    print(f"生成 {len(historical_df)} 条历史记录，保存到 {filename}")
    print(historical_df.head())
