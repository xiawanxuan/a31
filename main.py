import os
import sys
import argparse
import time
from datetime import datetime, timedelta
import pandas as pd

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from src.data_fetcher import DataFetcher
from src.data_preprocessor import DataPreprocessor
from src.predictor import TrafficPredictor
from src.visualizer import TrafficVisualizer
from src.exporter import ResultExporter


class TrafficAnalysisSystem:
    def __init__(self):
        self.fetcher = DataFetcher()
        self.preprocessor = DataPreprocessor()
        self.predictor = TrafficPredictor()
        self.visualizer = TrafficVisualizer()
        self.exporter = ResultExporter()

    def run_realtime_analysis(self, update_interval=60, duration=300):
        print("=" * 60)
        print("    城市交通流实时预测与可视化分析系统 - 实时模式")
        print("=" * 60)
        print(f"更新间隔: {update_interval} 秒")
        print(f"运行时长: {duration} 秒")
        print("=" * 60)

        start_time = time.time()
        iteration = 0

        historical_data = self._initialize_historical_data()

        while time.time() - start_time < duration:
            iteration += 1
            current_time = datetime.now()
            print(f"\n[{current_time.strftime('%Y-%m-%d %H:%M:%S')}] 第 {iteration} 次更新...")

            realtime_df = self.fetcher.fetch_realtime_data(current_time)
            historical_data = pd.concat([historical_data, realtime_df], ignore_index=True)

            processed_df = self.preprocessor.preprocess_pipeline(historical_data)

            predictions = self.predictor.predict_ensemble(processed_df)

            congestion_df = self.predictor.identify_congested_roads(processed_df, predictions)
            summary = self.predictor.get_congestion_summary(congestion_df)

            latest_data = processed_df.sort_values("timestamp").groupby("road_id").last().reset_index()

            traffic_map = self.visualizer.create_full_map(
                latest_data,
                predictions=predictions,
                congestion_df=congestion_df,
                summary=summary
            )

            map_filename = f"realtime_traffic_map.html"
            map_path = self.visualizer.save_map(traffic_map, map_filename)

            self._print_status(summary, congestion_df)

            print(f"  地图已更新: {map_path}")

            if iteration % 5 == 0:
                predictions_df = self.predictor.predictions_to_dataframe(predictions)
                self.exporter.export_full_report(
                    processed_df, congestion_df, summary, predictions_df,
                    filename=f"realtime_report_iter{iteration}"
                )
                print(f"  报告已导出 (第 {iteration} 次迭代)")

            if time.time() - start_time < duration:
                time.sleep(min(update_interval, duration - (time.time() - start_time)))

        print("\n" + "=" * 60)
        print("实时分析结束，生成最终报告...")

        predictions_df = self.predictor.predictions_to_dataframe(predictions)
        final_report = self.exporter.export_full_report(
            processed_df, congestion_df, summary, predictions_df,
            filename="final_realtime_report"
        )
        print(f"最终报告: {final_report}")

        return processed_df, predictions, congestion_df, summary

    def run_offline_analysis(self, data_file=None, days=7, output_filename=None):
        print("=" * 60)
        print("    城市交通流实时预测与可视化分析系统 - 离线模式")
        print("=" * 60)

        if data_file:
            print(f"数据文件: {data_file}")
            df = self.fetcher.load_offline_data(data_file)
        else:
            print(f"分析天数: {days} 天")
            print("正在生成模拟历史数据...")
            end_time = datetime.now()
            start_time = end_time - timedelta(days=days)
            df = self.fetcher.fetch_historical_data(start_time, end_time, interval_minutes=5)

        print(f"数据量: {len(df)} 条记录")
        print(f"时间范围: {df['timestamp'].min()} ~ {df['timestamp'].max()}")
        print(f"路段数量: {df['road_id'].nunique()}")
        print("=" * 60)

        print("\n[1/5] 数据预处理...")
        processed_df = self.preprocessor.preprocess_pipeline(df)
        print(f"  预处理完成，共 {len(processed_df)} 条记录，{len(processed_df.columns)} 个特征")

        print("\n[2/5] 交通流预测...")
        predictions = self.predictor.predict_ensemble(processed_df)
        predictions_df = self.predictor.predictions_to_dataframe(predictions)
        print(f"  预测完成，共预测 {len(predictions)} 条路段，每个路段预测 {self.predictor.horizon} 个时段")

        print("\n[3/5] 拥堵路段识别...")
        congestion_df = self.predictor.identify_congested_roads(processed_df, predictions)
        summary = self.predictor.get_congestion_summary(congestion_df)
        print(f"  识别出拥堵路段 {summary['congested_roads'] + summary['very_congested_roads']} 条")
        print(f"  拥堵率: {summary['congestion_rate']}%")

        print("\n[4/5] 生成可视化地图...")
        latest_data = processed_df.sort_values("timestamp").groupby("road_id").last().reset_index()
        traffic_map = self.visualizer.create_full_map(
            latest_data,
            predictions=predictions,
            congestion_df=congestion_df,
            summary=summary
        )

        map_filename = output_filename or "offline_traffic_map.html"
        map_path = self.visualizer.save_map(traffic_map, map_filename)
        print(f"  地图已保存: {map_path}")

        print("\n[5/5] 导出分析报告...")
        report_path = self.exporter.export_full_report(
            processed_df, congestion_df, summary, predictions_df,
            filename=output_filename or "offline_full_report"
        )
        text_report_path = self.exporter.export_analysis_report_text(
            summary, congestion_df,
            filename=output_filename or "offline_analysis_report"
        )
        print(f"  Excel报告: {report_path}")
        print(f"  文本报告: {text_report_path}")

        print("\n" + "=" * 60)
        print("离线分析完成！")
        print("=" * 60)

        results = {
            "processed_data": processed_df,
            "predictions": predictions,
            "congestion_data": congestion_df,
            "summary": summary,
            "map_path": map_path,
            "report_path": report_path,
            "text_report_path": text_report_path,
        }

        return results

    def _initialize_historical_data(self, hours=24):
        end_time = datetime.now()
        start_time = end_time - timedelta(hours=hours)
        df = self.fetcher.fetch_historical_data(start_time, end_time, interval_minutes=15)
        return df

    def _print_status(self, summary, congestion_df):
        print(f"  拥堵率: {summary['congestion_rate']}% | "
              f"平均速度: {summary['avg_speed']} km/h | "
              f"平均流量: {summary['avg_flow']} 辆/h")

        if len(congestion_df) > 0:
            top_congested = congestion_df.head(3)
            print(f"  最拥堵路段: ", end="")
            for _, row in top_congested.iterrows():
                print(f"{row['road_name']}({row['current_speed']}km/h) ", end="")
            print()

    def generate_sample_data(self, days=7, filename=None):
        print(f"正在生成 {days} 天的示例数据...")
        df, data_filename = self.fetcher.generate_sample_data(days=days)

        if filename:
            self.fetcher.save_data(df, filename)
            data_filename = filename

        print(f"示例数据已生成: {data_filename}")
        print(f"数据量: {len(df)} 条记录")
        return df, data_filename


def main():
    parser = argparse.ArgumentParser(
        description="城市交通流实时预测与可视化分析系统"
    )

    parser.add_argument(
        "--mode",
        choices=["realtime", "offline", "sample"],
        default="offline",
        help="运行模式: realtime(实时), offline(离线), sample(生成示例数据)"
    )

    parser.add_argument(
        "--days",
        type=int,
        default=7,
        help="离线模式下分析的天数（默认7天）"
    )

    parser.add_argument(
        "--data-file",
        type=str,
        default=None,
        help="离线模式下使用的数据文件路径"
    )

    parser.add_argument(
        "--duration",
        type=int,
        default=300,
        help="实时模式运行时长（秒，默认300秒）"
    )

    parser.add_argument(
        "--interval",
        type=int,
        default=60,
        help="实时模式更新间隔（秒，默认60秒）"
    )

    parser.add_argument(
        "--output",
        type=str,
        default=None,
        help="输出文件名前缀"
    )

    args = parser.parse_args()

    system = TrafficAnalysisSystem()

    if args.mode == "sample":
        system.generate_sample_data(days=args.days, filename=args.output)

    elif args.mode == "realtime":
        system.run_realtime_analysis(
            update_interval=args.interval,
            duration=args.duration
        )

    else:
        system.run_offline_analysis(
            data_file=args.data_file,
            days=args.days,
            output_filename=args.output
        )


if __name__ == "__main__":
    main()
