import pandas as pd
import numpy as np
from datetime import datetime
import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from config.settings import SPEED_THRESHOLDS


class DataPreprocessor:
    def __init__(self):
        self.speed_thresholds = SPEED_THRESHOLDS

    def clean_data(self, df):
        df = df.copy()
        df = df.drop_duplicates(subset=["road_id", "timestamp"])
        df = df.sort_values(["road_id", "timestamp"]).reset_index(drop=True)

        df["flow"] = df["flow"].clip(lower=0)
        df["avg_speed"] = df["avg_speed"].clip(lower=0, upper=120)
        df["occupancy"] = df["occupancy"].clip(lower=0, upper=100)

        numeric_cols = ["flow", "avg_speed", "occupancy"]
        df[numeric_cols] = df[numeric_cols].interpolate(method="linear")

        df = df.dropna(subset=["road_id", "timestamp"])

        return df

    def add_time_features(self, df):
        df = df.copy()
        if not pd.api.types.is_datetime64_any_dtype(df["timestamp"]):
            df["timestamp"] = pd.to_datetime(df["timestamp"])

        df["hour"] = df["timestamp"].dt.hour
        df["minute"] = df["timestamp"].dt.minute
        df["day_of_week"] = df["timestamp"].dt.dayofweek
        df["day_of_month"] = df["timestamp"].dt.day
        df["month"] = df["timestamp"].dt.month
        df["is_weekend"] = (df["day_of_week"] >= 5).astype(int)
        df["time_of_day"] = df["hour"] * 60 + df["minute"]

        df["is_morning_peak"] = ((df["hour"] >= 7) & (df["hour"] <= 9)).astype(int)
        df["is_evening_peak"] = ((df["hour"] >= 17) & (df["hour"] <= 19)).astype(int)
        df["is_peak_hour"] = (df["is_morning_peak"] | df["is_evening_peak"]).astype(int)

        return df

    def add_rolling_features(self, df, windows=[3, 6, 12]):
        df = df.copy()
        df = df.sort_values(["road_id", "timestamp"]).reset_index(drop=True)

        for road_id in df["road_id"].unique():
            mask = df["road_id"] == road_id
            for window in windows:
                df.loc[mask, f"flow_rolling_mean_{window}"] = (
                    df.loc[mask, "flow"].rolling(window=window, min_periods=1).mean()
                )
                df.loc[mask, f"speed_rolling_mean_{window}"] = (
                    df.loc[mask, "avg_speed"].rolling(window=window, min_periods=1).mean()
                )
                df.loc[mask, f"flow_rolling_std_{window}"] = (
                    df.loc[mask, "flow"].rolling(window=window, min_periods=1).std()
                )

        return df

    def add_traffic_status(self, df):
        df = df.copy()

        def get_status(speed):
            if speed >= self.speed_thresholds["smooth"]:
                return "smooth"
            elif speed >= self.speed_thresholds["slow"]:
                return "slow"
            elif speed >= self.speed_thresholds["congested"]:
                return "congested"
            else:
                return "very_congested"

        df["traffic_status"] = df["avg_speed"].apply(get_status)

        status_map = {"smooth": 0, "slow": 1, "congested": 2, "very_congested": 3}
        df["traffic_status_code"] = df["traffic_status"].map(status_map)

        return df

    def normalize_data(self, df, columns=None):
        df = df.copy()
        if columns is None:
            columns = ["flow", "avg_speed", "occupancy"]

        norm_params = {}
        for col in columns:
            mean = df[col].mean()
            std = df[col].std()
            if std == 0:
                df[f"{col}_norm"] = 0
            else:
                df[f"{col}_norm"] = (df[col] - mean) / std
            norm_params[col] = {"mean": mean, "std": std}

        return df, norm_params

    def aggregate_by_road(self, df):
        agg_df = df.groupby("road_id").agg({
            "road_name": "first",
            "flow": ["mean", "max", "min", "std"],
            "avg_speed": ["mean", "max", "min", "std"],
            "occupancy": ["mean", "max", "min", "std"],
            "start_lat": "first",
            "start_lon": "first",
            "end_lat": "first",
            "end_lon": "first",
        }).reset_index()

        agg_df.columns = ["_".join(col).strip("_") for col in agg_df.columns.values]
        return agg_df

    def aggregate_by_time(self, df, freq="H"):
        df = df.copy()
        df = df.set_index("timestamp")

        agg_df = df.groupby("road_id").resample(freq).agg({
            "flow": "mean",
            "avg_speed": "mean",
            "occupancy": "mean",
            "road_name": "first",
        }).reset_index()

        return agg_df

    def preprocess_pipeline(self, df, add_features=True, add_rolling=True, add_status=True):
        df = self.clean_data(df)

        if add_features:
            df = self.add_time_features(df)

        if add_rolling:
            df = self.add_rolling_features(df)

        if add_status:
            df = self.add_traffic_status(df)

        return df

    def prepare_prediction_data(self, df, target_col="avg_speed", lookback=24):
        df = df.copy()
        df = df.sort_values(["road_id", "timestamp"]).reset_index(drop=True)

        result_list = []

        for road_id in df["road_id"].unique():
            road_data = df[df["road_id"] == road_id].sort_values("timestamp").copy()
            for i in range(1, lookback + 1):
                road_data[f"lag_{i}"] = road_data[target_col].shift(i)
            result_list.append(road_data)

        result_df = pd.concat(result_list, ignore_index=True)
        result_df = result_df.dropna()

        return result_df


if __name__ == "__main__":
    from src.data_fetcher import DataFetcher

    fetcher = DataFetcher()
    preprocessor = DataPreprocessor()

    print("=== 生成测试数据 ===")
    df = fetcher.fetch_historical_data(
        datetime.now() - pd.Timedelta(days=1),
        datetime.now(),
        interval_minutes=30
    )
    print(f"原始数据: {len(df)} 条")

    print("\n=== 数据清洗 ===")
    cleaned_df = preprocessor.clean_data(df)
    print(f"清洗后数据: {len(cleaned_df)} 条")

    print("\n=== 添加时间特征 ===")
    featured_df = preprocessor.add_time_features(cleaned_df)
    print(f"特征列: {list(featured_df.columns)}")

    print("\n=== 添加交通状态 ===")
    status_df = preprocessor.add_traffic_status(featured_df)
    print(status_df[["road_name", "avg_speed", "traffic_status"]].head())

    print("\n=== 完整预处理流程 ===")
    processed_df = preprocessor.preprocess_pipeline(df)
    print(f"预处理后数据: {len(processed_df)} 条, {len(processed_df.columns)} 列")
    print(processed_df.head())
