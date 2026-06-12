CITY_CENTER = (39.9042, 116.4074)
MAP_ZOOM = 12
DATA_UPDATE_INTERVAL = 60

CONGESTION_THRESHOLD_SPEED = 20
CONGESTION_THRESHOLD_FLOW = 800

PREDICTION_HORIZON = 12
PREDICTION_INTERVAL = 5

ROAD_SEGMENTS = [
    {"id": "R001", "name": "长安街东段", "start": (39.9087, 116.4205), "end": (39.9087, 116.4505), "lanes": 8},
    {"id": "R002", "name": "长安街西段", "start": (39.9087, 116.3805), "end": (39.9087, 116.4205), "lanes": 8},
    {"id": "R003", "name": "东三环北路", "start": (39.9387, 116.4505), "end": (39.9087, 116.4505), "lanes": 6},
    {"id": "R004", "name": "东三环南路", "start": (39.9087, 116.4505), "end": (39.8787, 116.4505), "lanes": 6},
    {"id": "R005", "name": "北三环东路", "start": (39.9687, 116.4205), "end": (39.9687, 116.4505), "lanes": 6},
    {"id": "R006", "name": "北三环中路", "start": (39.9687, 116.3805), "end": (39.9687, 116.4205), "lanes": 6},
    {"id": "R007", "name": "西三环北路", "start": (39.9387, 116.3205), "end": (39.9087, 116.3205), "lanes": 6},
    {"id": "R008", "name": "西三环南路", "start": (39.9087, 116.3205), "end": (39.8787, 116.3205), "lanes": 6},
    {"id": "R009", "name": "南三环东路", "start": (39.8587, 116.4205), "end": (39.8587, 116.4505), "lanes": 6},
    {"id": "R010", "name": "南三环中路", "start": (39.8587, 116.3805), "end": (39.8587, 116.4205), "lanes": 6},
    {"id": "R011", "name": "王府井大街", "start": (39.9187, 116.4105), "end": (39.9087, 116.4105), "lanes": 4},
    {"id": "R012", "name": "金融街", "start": (39.9287, 116.3505), "end": (39.9087, 116.3505), "lanes": 4},
    {"id": "R013", "name": "中关村大街", "start": (39.9887, 116.3205), "end": (39.9687, 116.3205), "lanes": 4},
    {"id": "R014", "name": "朝阳路", "start": (39.9187, 116.4805), "end": (39.9187, 116.4505), "lanes": 6},
    {"id": "R015", "name": "建国门外大街", "start": (39.9087, 116.4505), "end": (39.9087, 116.4805), "lanes": 8},
]

DATA_DIR = "data"
OUTPUT_DIR = "output"

COLORS = {
    "smooth": "green",
    "slow": "yellow",
    "congested": "red",
    "very_congested": "darkred",
    "predicted": "blue"
}

SPEED_THRESHOLDS = {
    "smooth": 50,
    "slow": 30,
    "congested": 20,
    "very_congested": 10
}
