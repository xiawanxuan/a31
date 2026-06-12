import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from collections import defaultdict
import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from config.settings import CONGESTION_THRESHOLD_SPEED, PREDICTION_HORIZON, PREDICTION_INTERVAL


class TrafficPredictor:
    def __init__(self, horizon=PREDICTION_HORIZON, interval=PREDICTION_INTERVAL):
        self.horizon = horizon
        self.interval = interval
        self.congestion_threshold = CONGESTION_THRESHOLD_SPEED
        self.models = {}

    def predict_moving_average(self, df, target_col="avg_speed", window=12):
        predictions = {}

        for road_id in df["road_id"].unique():
            road_data = df[df["road_id"] == road_id].sort_values("timestamp")
            road_name = road_data["road_name"].iloc[0]
            last_timestamp = road_data["timestamp"].iloc[-1]

            ma_values = road_data[target_col].rolling(window=window, min_periods=1).mean()
            last_ma = ma_values.iloc[-1]
            last_value = road_data[target_col].iloc[-1]
            trend = last_value - ma_values.iloc[-window] if len(ma_values) >= window else 0

            pred_values = []
            pred_timestamps = []
            current = last_timestamp

            for i in range(self.horizon):
                current = current + timedelta(minutes=self.interval)
                decay = 1 - (i / self.horizon) * 0.3
                pred = last_ma + trend * decay * 0.5
                pred = pred + np.random.normal(0, 2)
                pred = max(5, min(80, pred))
                pred_values.append(round(pred, 1))
                pred_timestamps.append(current)

            predictions[road_id] = {
                "road_name": road_name,
                "timestamps": pred_timestamps,
                "values": pred_values,
                "method": "moving_average"
            }

        return predictions

    def predict_linear_regression(self, df, target_col="avg_speed", lookback=24):
        predictions = {}

        for road_id in df["road_id"].unique():
            road_data = df[df["road_id"] == road_id].sort_values("timestamp")
            road_name = road_data["road_name"].iloc[0]
            last_timestamp = road_data["timestamp"].iloc[-1]
            values = road_data[target_col].values

            if len(values) < lookback:
                lookback = len(values)

            recent_values = values[-lookback:]
            x = np.arange(len(recent_values))
            slope, intercept = np.polyfit(x, recent_values, 1)

            pred_values = []
            pred_timestamps = []
            current = last_timestamp

            for i in range(self.horizon):
                current = current + timedelta(minutes=self.interval)
                pred_x = len(recent_values) + i
                pred = slope * pred_x + intercept
                pred = max(5, min(80, pred))
                pred_values.append(round(pred, 1))
                pred_timestamps.append(current)

            predictions[road_id] = {
                "road_name": road_name,
                "timestamps": pred_timestamps,
                "values": pred_values,
                "method": "linear_regression"
            }

        return predictions

    def predict_time_pattern(self, df, target_col="avg_speed"):
        predictions = {}

        for road_id in df["road_id"].unique():
            road_data = df[df["road_id"] == road_id].sort_values("timestamp").copy()
            road_name = road_data["road_name"].iloc[0]
            last_timestamp = road_data["timestamp"].iloc[-1]

            road_data["hour"] = road_data["timestamp"].dt.hour
            road_data["minute"] = road_data["timestamp"].dt.minute
            road_data["time_minutes"] = road_data["hour"] * 60 + road_data["minute"]

            time_pattern = road_data.groupby("time_minutes")[target_col].mean().to_dict()
            time_keys = sorted(time_pattern.keys())

            pred_values = []
            pred_timestamps = []
            current = last_timestamp

            for i in range(self.horizon):
                current = current + timedelta(minutes=self.interval)
                time_min = current.hour * 60 + current.minute

                if time_min in time_pattern:
                    base_pred = time_pattern[time_min]
                else:
                    closest_key = min(time_keys, key=lambda x: abs(x - time_min))
                    base_pred = time_pattern[closest_key]

                last_value = road_data[target_col].iloc[-1]
                pred = 0.6 * base_pred + 0.4 * last_value
                pred = max(5, min(80, pred))
                pred_values.append(round(pred, 1))
                pred_timestamps.append(current)

            predictions[road_id] = {
                "road_name": road_name,
                "timestamps": pred_timestamps,
                "values": pred_values,
                "method": "time_pattern"
            }

        return predictions

    def predict_ensemble(self, df, target_col="avg_speed"):
        ma_preds = self.predict_moving_average(df, target_col)
        lr_preds = self.predict_linear_regression(df, target_col)
        tp_preds = self.predict_time_pattern(df, target_col)

        predictions = {}

        for road_id in ma_preds.keys():
            ma_vals = np.array(ma_preds[road_id]["values"])
            lr_vals = np.array(lr_preds[road_id]["values"])
            tp_vals = np.array(tp_preds[road_id]["values"])

            ensemble_vals = (0.3 * ma_vals + 0.2 * lr_vals + 0.5 * tp_vals)

            predictions[road_id] = {
                "road_name": ma_preds[road_id]["road_name"],
                "timestamps": ma_preds[road_id]["timestamps"],
                "values": [round(v, 1) for v in ensemble_vals],
                "method": "ensemble",
                "ma_values": ma_preds[road_id]["values"],
                "lr_values": lr_preds[road_id]["values"],
                "tp_values": tp_preds[road_id]["values"]
            }

        return predictions

    def identify_congested_roads(self, df, predictions=None):
        congestion_data = []

        for road_id in df["road_id"].unique():
            road_data = df[df["road_id"] == road_id].sort_values("timestamp")
            road_name = road_data["road_name"].iloc[0]
            current_speed = road_data["avg_speed"].iloc[-1]
            current_flow = road_data["flow"].iloc[-1]
            current_occupancy = road_data["occupancy"].iloc[-1]

            recent_speeds = road_data["avg_speed"].tail(6)
            avg_recent_speed = recent_speeds.mean()

            is_congested = current_speed < self.congestion_threshold

            congestion_level = "smooth"
            if current_speed >= 50:
                congestion_level = "smooth"
            elif current_speed >= 30:
                congestion_level = "slow"
            elif current_speed >= 20:
                congestion_level = "congested"
            else:
                congestion_level = "very_congested"

            future_congestion = None
            if predictions and road_id in predictions:
                future_speeds = predictions[road_id]["values"]
                min_future_speed = min(future_speeds)
                avg_future_speed = np.mean(future_speeds)

                if avg_future_speed >= 50:
                    future_congestion = "smooth"
                elif avg_future_speed >= 30:
                    future_congestion = "slow"
                elif avg_future_speed >= 20:
                    future_congestion = "congested"
                else:
                    future_congestion = "very_congested"

            congestion_data.append({
                "road_id": road_id,
                "road_name": road_name,
                "current_speed": current_speed,
                "current_flow": current_flow,
                "current_occupancy": current_occupancy,
                "avg_recent_speed": round(avg_recent_speed, 1),
                "is_congested": is_congested,
                "congestion_level": congestion_level,
                "future_congestion": future_congestion,
                "start_lat": road_data["start_lat"].iloc[0],
                "start_lon": road_data["start_lon"].iloc[0],
                "end_lat": road_data["end_lat"].iloc[0],
                "end_lon": road_data["end_lon"].iloc[0],
            })

        congestion_df = pd.DataFrame(congestion_data)
        congestion_df = congestion_df.sort_values("current_speed").reset_index(drop=True)

        return congestion_df

    def get_congestion_summary(self, congestion_df):
        total_roads = len(congestion_df)
        level_counts = congestion_df["congestion_level"].value_counts().to_dict()

        summary = {
            "total_roads": total_roads,
            "smooth_roads": level_counts.get("smooth", 0),
            "slow_roads": level_counts.get("slow", 0),
            "congested_roads": level_counts.get("congested", 0),
            "very_congested_roads": level_counts.get("very_congested", 0),
            "congestion_rate": round(
                (level_counts.get("congested", 0) + level_counts.get("very_congested", 0)) / total_roads * 100,
                1
            ) if total_roads > 0 else 0,
            "avg_speed": round(congestion_df["current_speed"].mean(), 1),
            "avg_flow": round(congestion_df["current_flow"].mean(), 1),
        }

        return summary

    def predictions_to_dataframe(self, predictions):
        rows = []
        for road_id, pred_data in predictions.items():
            for i, (ts, val) in enumerate(zip(pred_data["timestamps"], pred_data["values"])):
                rows.append({
                    "road_id": road_id,
                    "road_name": pred_data["road_name"],
                    "timestamp": ts,
                    "predicted_speed": val,
                    "prediction_horizon": i + 1,
                    "method": pred_data["method"],
                })

        return pd.DataFrame(rows)


if __name__ == "__main__":
    from src.data_fetcher import DataFetcher
    from src.data_preprocessor import DataPreprocessor

    fetcher = DataFetcher()
    preprocessor = DataPreprocessor()
    predictor = TrafficPredictor()

    print("=== 生成测试数据 ===")
    df = fetcher.fetch_historical_data(
        datetime.now() - pd.Timedelta(days=3),
        datetime.now(),
        interval_minutes=30
    )
    processed_df = preprocessor.preprocess_pipeline(df)
    print(f"处理后数据: {len(processed_df)} 条")

    print("\n=== 移动平均预测 ===")
    ma_preds = predictor.predict_moving_average(processed_df)
    sample_road = list(ma_preds.keys())[0]
    print(f"路段 {ma_preds[sample_road]['road_name']} 预测结果:")
    for ts, val in zip(ma_preds[sample_road]["timestamps"], ma_preds[sample_road]["values"]):
        print(f"  {ts.strftime('%H:%M')}: {val} km/h")

    print("\n=== 集成预测 ===")
    ensemble_preds = predictor.predict_ensemble(processed_df)
    print(f"路段 {ensemble_preds[sample_road]['road_name']} 集成预测结果:")
    for ts, val in zip(ensemble_preds[sample_road]["timestamps"], ensemble_preds[sample_road]["values"]):
        print(f"  {ts.strftime('%H:%M')}: {val} km/h")

    print("\n=== 拥堵路段识别 ===")
    congestion_df = predictor.identify_congested_roads(processed_df, ensemble_preds)
    print(congestion_df[["road_name", "current_speed", "congestion_level", "future_congestion"]].head(10))

    print("\n=== 拥堵汇总 ===")
    summary = predictor.get_congestion_summary(congestion_df)
    for key, val in summary.items():
        print(f"  {key}: {val}")
