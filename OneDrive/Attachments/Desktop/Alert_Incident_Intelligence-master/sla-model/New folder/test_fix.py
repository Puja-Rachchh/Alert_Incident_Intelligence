from train_and_save_model import SLAScorePredictor
import joblib
import pandas as pd

# Load model and data
model = joblib.load('sla_score_predictor_model.pkl')
df = pd.read_csv('test_data.csv')

# Create predictor
predictor = SLAScorePredictor(model, df)

# Test prediction
result = predictor.predict_sla_with_alerts(num_new_alerts=2, alert_severity='P3')

print('✅ Model loaded and prediction works!')
print(f'   Breach Probability: {result["breach_probability_%"]:.2f}%')
print(f'   Risk Level: {result["risk_level"]}')
