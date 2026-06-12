import pandas as pd
import os
import sys
from datetime import datetime
import json

sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from config.settings import OUTPUT_DIR


class ResultExporter:
    def __init__(self, output_dir=OUTPUT_DIR):
        self.output_dir = output_dir
        if not os.path.exists(self.output_dir):
            os.makedirs(self.output_dir)

    def export_traffic_data(self, df, filename=None, format="csv"):
        if filename is None:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"traffic_data_{timestamp}"

        filepath = os.path.join(self.output_dir, f"{filename}.{format}")

        if format == "csv":
            df.to_csv(filepath, index=False, encoding="utf-8-sig")
        elif format == "excel":
            filepath = os.path.join(self.output_dir, f"{filename}.xlsx")
            df.to_excel(filepath, index=False, engine="openpyxl")
        elif format == "json":
            df.to_json(filepath, orient="records", force_ascii=False, indent=2)
        else:
            raise ValueError(f"不支持的导出格式: {format}")

        return filepath

    def export_congestion_report(self, congestion_df, summary, filename=None):
        if filename is None:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"congestion_report_{timestamp}"

        filepath = os.path.join(self.output_dir, f"{filename}.xlsx")

        with pd.ExcelWriter(filepath, engine="openpyxl") as writer:
            summary_df = pd.DataFrame([summary])
            summary_df.T.to_excel(writer, sheet_name="汇总", header=["数值"])

            congestion_df.to_excel(writer, sheet_name="拥堵路段详情", index=False)

        return filepath

    def export_predictions(self, predictions_df, filename=None):
        if filename is None:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"traffic_predictions_{timestamp}"

        filepath = os.path.join(self.output_dir, f"{filename}.csv")
        predictions_df.to_csv(filepath, index=False, encoding="utf-8-sig")
        return filepath

    def export_full_report(self, processed_df, congestion_df, summary, predictions_df=None, filename=None):
        if filename is None:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"full_traffic_report_{timestamp}"

        filepath = os.path.join(self.output_dir, f"{filename}.xlsx")

        with pd.ExcelWriter(filepath, engine="openpyxl") as writer:
            summary_data = {
                "指标": [
                    "总路段数", "畅通路段", "缓行路段", "拥堵路段", "严重拥堵路段",
                    "拥堵率(%)", "平均速度(km/h)", "平均流量(辆/h)",
                    "报告生成时间"
                ],
                "数值": [
                    summary["total_roads"],
                    summary["smooth_roads"],
                    summary["slow_roads"],
                    summary["congested_roads"],
                    summary["very_congested_roads"],
                    summary["congestion_rate"],
                    summary["avg_speed"],
                    summary["avg_flow"],
                    datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                ]
            }
            pd.DataFrame(summary_data).to_excel(writer, sheet_name="交通概览", index=False)

            congestion_df.to_excel(writer, sheet_name="拥堵路段分析", index=False)

            latest_data = processed_df.sort_values("timestamp").groupby("road_id").last().reset_index()
            latest_data[["road_id", "road_name", "timestamp", "flow", "avg_speed", "occupancy", "traffic_status"]].to_excel(
                writer, sheet_name="实时数据", index=False
            )

            if predictions_df is not None:
                predictions_df.to_excel(writer, sheet_name="预测数据", index=False)

        return filepath

    def export_analysis_report_text(self, summary, congestion_df, filename=None):
        if filename is None:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"analysis_report_{timestamp}.txt"

        filepath = os.path.join(self.output_dir, filename)

        top_congested = congestion_df.head(5)
        top_congested_list = "\n".join([
            f"    {i+1}. {row['road_name']}: {row['current_speed']} km/h ({row['congestion_level']})"
            for i, row in top_congested.iterrows()
        ])

        report = f"""
{'='*60}
                城市交通流分析报告
{'='*60}

生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

【交通概览】
  总监测路段: {summary['total_roads']} 条
  畅通路段:   {summary['smooth_roads']} 条
  缓行路段:   {summary['slow_roads']} 条
  拥堵路段:   {summary['congested_roads']} 条
  严重拥堵:   {summary['very_congested_roads']} 条
  拥堵率:     {summary['congestion_rate']}%
  平均车速:   {summary['avg_speed']} km/h
  平均流量:   {summary['avg_flow']} 辆/小时

【最拥堵路段 TOP 5】
{top_congested_list}

【拥堵趋势分析】
  {'整体交通状况良好' if summary['congestion_rate'] < 20 else ''}
  {'交通压力较大，建议错峰出行' if 20 <= summary['congestion_rate'] < 50 else ''}
  {'交通严重拥堵，建议优先选择公共交通' if summary['congestion_rate'] >= 50 else ''}

{'='*60}
报告由城市交通流实时预测与可视化分析系统自动生成
{'='*60}
"""

        with open(filepath, "w", encoding="utf-8") as f:
            f.write(report)

        return filepath


if __name__ == "__main__":
    from src.data_fetcher import DataFetcher
    from src.data_preprocessor import DataPreprocessor
    from src.predictor import TrafficPredictor

    fetcher = DataFetcher()
    preprocessor = DataPreprocessor()
    predictor = TrafficPredictor()
    exporter = ResultExporter()

    print("=== 生成测试数据 ===")
    historical_df = fetcher.fetch_historical_data(
        datetime.now() - pd.Timedelta(days=1),
        datetime.now(),
        interval_minutes=30
    )
    processed_df = preprocessor.preprocess_pipeline(historical_df)
    predictions = predictor.predict_ensemble(processed_df)
    predictions_df = predictor.predictions_to_dataframe(predictions)
    congestion_df = predictor.identify_congested_roads(processed_df, predictions)
    summary = predictor.get_congestion_summary(congestion_df)

    print("\n=== 导出交通数据 (CSV) ===")
    csv_path = exporter.export_traffic_data(processed_df, format="csv")
    print(f"已导出到: {csv_path}")

    print("\n=== 导出完整报告 (Excel) ===")
    report_path = exporter.export_full_report(
        processed_df, congestion_df, summary, predictions_df
    )
    print(f"已导出到: {report_path}")

    print("\n=== 导出分析报告 (文本) ===")
    text_path = exporter.export_analysis_report_text(summary, congestion_df)
    print(f"已导出到: {text_path}")
