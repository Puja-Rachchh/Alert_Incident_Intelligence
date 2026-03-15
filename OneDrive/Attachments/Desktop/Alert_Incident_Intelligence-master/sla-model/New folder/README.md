# SLA Score Predictor - Frontend & Tests

A complete machine learning solution for predicting SLA score impact with real-time alert analysis. Features a Streamlit web frontend and comprehensive test suite.

## 📁 Project Structure

```
├── train_and_save_model.py      # Train and save the XGBoost model
├── app.py                        # Streamlit frontend application
├── test_model.py                 # Comprehensive test suite
├── create_test_data.py           # Generate test datasets
├── test_data.csv                 # Sample test data (generated)
├── requirements.txt              # Python dependencies
├── sla_score_predictor.pkl       # Trained model (generated)
└── README.md                     # This file
```

## 🚀 Quick Start

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Train and Save the Model

```bash
python train_and_save_model.py
```

This will:
- Create synthetic training data (1000 samples)
- Train an XGBoost classifier
- Save the model as `sla_score_predictor.pkl`
- Display accuracy metrics

Expected output:
```
Training SLA Score Predictor Model...
Training XGBoost model...
Train Accuracy: 0.8XXX
Test Accuracy: 0.7XXX

✅ Model saved successfully!
   - sla_score_predictor_model.pkl (XGBoost model)
   - sla_score_predictor.pkl (SLAScorePredictor class with baseline)
```

### 3. Run Tests

Test the model with comprehensive unit tests:

```bash
python test_model.py
```

Expected output:
```
==================================================
🧪 Running SLA Score Predictor Tests
==================================================

✅ Test: Data generation - PASSED
✅ Test: Model loading - PASSED
✅ Test: Single prediction - PASSED
✅ Test: Batch predictions - PASSED
✅ Test: All severity levels - PASSED
✅ Test: Alert count impact - PASSED
✅ Test: Output format - PASSED

==================================================
✅ All tests completed!
==================================================
```

### 4. Create Test Data

Generate test datasets for evaluation:

```bash
python create_test_data.py
```

This creates `test_data.csv` with 500 sample records.

### 5. Launch the Web Frontend

Start the Streamlit application:

```bash
streamlit run app.py
```

The frontend will open in your browser at `http://localhost:8501`

## 📊 Frontend Features

### Single Prediction Page
- Input alert parameters:
  - Number of related alerts (0-20)
  - Alert severity (P4, P3, P2, P1)
  - Customer, Alert Type, and Device keys
- Get real-time predictions:
  - Baseline SLA score
  - Breach probability percentage
  - Expected impact on SLA
  - Predicted SLA after alert
  - Risk level indicator

### Batch Predictions Page
- Run 5 predefined scenarios simultaneously
- Get prediction results in table format
- View summary statistics:
  - Average breach probability
  - Critical alerts count
  - Total predicted breaches

### Model Info Page
- View model details and statistics
- See feature descriptions
- Check baseline SLA score
- Understand feature encodings

## 🧪 Model Details

**Algorithm**: XGBoost Classifier

**Features Used**:
- `num_related_alerts`: Number of related/similar alerts
- `alert_hour`: Hour of day (0-23)
- `day_of_week`: Day of week (0=Monday, 6=Sunday)
- `is_business_hours`: Binary flag for business hours
- `customer_key`: Customer identifier
- `alert_type_key`: Type of alert
- `device_key`: Device identifier
- `severity_order`: Severity level (1=P4, 2=P3, 3=P2, 4=P1)

**Output**:
- Breach probability (0-100%)
- Predicted SLA after alert impact
- Risk level (LOW, HIGH, CRITICAL)
- Whether SLA will be breached

## 📈 Usage Examples

### Example 1: Single Alert Prediction
```python
from train_and_save_model import SLAScorePredictor
import joblib

predictor = joblib.load('sla_score_predictor.pkl')

result = predictor.predict_sla_with_alerts(
    num_new_alerts=3,
    alert_severity='P2',
    customer_key=5,
    alert_type_key=2,
    device_key=15
)

print(f"Breach Probability: {result['breach_probability_%']:.2f}%")
print(f"Risk Level: {result['risk_level']}")
```

### Example 2: Batch Predictions
```python
scenarios = [
    {"num_new_alerts": 1, "alert_severity": "P4", "customer_key": 1, ...},
    {"num_new_alerts": 5, "alert_severity": "P1", "customer_key": 2, ...},
]

results_df = predictor.predict_sla_batch(scenarios)
print(results_df)
```

## 🧪 Testing

The test suite includes:

1. **Data Generation Test** - Validates synthetic data creation
2. **Model Loading Test** - Ensures saved model can be loaded
3. **Single Prediction Test** - Tests individual predictions
4. **Batch Predictions Test** - Tests batch processing
5. **All Severity Levels Test** - Validates all severity combinations
6. **Alert Count Impact Test** - Verifies alert count affects probability
7. **Output Format Test** - Validates result structure

Run with: `python test_model.py`

## 🔧 Configuration

### Modify Model Training
Edit `train_and_save_model.py`:
- `n_samples`: Training dataset size
- `n_estimators`: Number of boosting rounds
- `max_depth`: Tree depth
- `learning_rate`: Boosting learning rate

### Modify Severity Mapping
Edit in `train_and_save_model.py`:
```python
severity_map = {'P4': 1, 'P3': 2, 'P2': 3, 'P1': 4}
```

## 📋 Requirements

- Python 3.7+
- pandas >= 1.3.0
- numpy >= 1.21.0
- scikit-learn >= 1.0.0
- xgboost >= 1.5.0
- joblib >= 1.1.0
- streamlit >= 1.20.0
- matplotlib >= 3.5.0
- seaborn >= 0.11.0

## 🐛 Troubleshooting

**Error: Model not found**
```
Solution: Run python train_and_save_model.py first
```

**Error: Module not found**
```
Solution: pip install -r requirements.txt
```

**Streamlit won't start**
```
Solution: streamlit run app.py --logger.level=debug
```

## 📝 Notes

- Model is trained on synthetic data for demonstration
- Predictions are based on XGBoost classifier
- Baseline SLA calculated from historical data
- All tests can be run without the Streamlit frontend

## 🎯 Next Steps

1. Replace synthetic data with real historical SLA data
2. Fine-tune model hyperparameters
3. Add database integration for model serving
4. Deploy frontend to cloud platform
5. Add API endpoints for programmatic access

---

**Last Updated**: March 15, 2026
