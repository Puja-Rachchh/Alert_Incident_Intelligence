# 🚀 Quick Start Guide - Enhanced SLA Score Predictor

## 📋 What's New?

✨ **Model Accuracy**: 98.50% (up from ~70%)
🚨 **Heavy Problem Detection**: Automatically detects critical situations
💥 **SLA Impact**: 446x stronger impact on heavy problems
📊 **Better Features**: 11 optimized features with heavy problem detection

---

## ⚡ Quick Start (2 minutes)

### Step 1: Install Dependencies
```bash
pip install -r requirements.txt
```

### Step 2: Model Already Trained! ✅
The model is pre-trained and ready to use:
- `sla_score_predictor.pkl` - Full predictor with heavy problem detection
- `sla_score_predictor_model.pkl` - XGBoost model
- `feature_cols.pkl` - Feature list

### Step 3: Launch Streamlit Frontend
```bash
streamlit run app.py
```

🌐 Opens at: http://localhost:8501

---

## 🧪 Run Tests

```bash
python test_model.py
```

**Expected Output:**
```
✅ All 8 tests PASSED
- Heavy problem detection working
- Model accuracy: 98.50%
- Normal alert impact: 0.01%
- Heavy problem impact: 4.46%
```

---

## 📊 Frontend Features

### 1️⃣ Single Prediction
- Enter alert parameters
- Get instant prediction
- See heavy problem detection
- View 3x impact multiplier

### 2️⃣ Batch Predictions
- Run 5 test scenarios
- Compare results
- See heavy problem stats

### 3️⃣ Model Info
- View model details
- See heavy problem logic
- Understand impact multipliers

---

## 🎯 Heavy Problem Detection

Heavy problems are detected when:
1. **P1/P2 Alert + Multiple Alerts** (2+)
2. **Alert Storm** (5+ high-severity alerts)
3. **Critical System Alert** (types 1-3 with P1/P2)

**Result:** 3.0x impact multiplier on SLA degradation!

---

## 📈 Example Predictions

### Normal Alert
```
Alert: 1 P4 alert
Breach Probability: 0.23%
SLA Impact: -0.01%
Status: ✅ LOW RISK
```

### Heavy Problem
```
Alert: 3 P1 alerts (critical system)
Breach Probability: 99.00%
SLA Impact: -4.46%
Status: 🔴 CRITICAL DETECTED
```

---

## 🔧 Retrain Model (Optional)

To retrain with new data:
```bash
python train_and_save_model.py
```

To create new test data:
```bash
python create_test_data.py
```

---

## 📁 Files

| File | Purpose |
|------|---------|
| `app.py` | Streamlit frontend |
| `train_and_save_model.py` | Model training |
| `test_model.py` | Test suite (8 tests) |
| `create_test_data.py` | Generate test CSV |
| `sla_score_predictor.pkl` | Trained model |
| `requirements.txt` | Dependencies |
| `ENHANCEMENT_SUMMARY.md` | Detailed improvements |

---

## 🎓 Key Improvements

### Accuracy
- **Before**: 70-80%
- **After**: 98.50% ✅

### Heavy Problem Detection
- Detects critical situations
- 446x stronger SLA impact
- Production ready

### Features
- 11 optimized features
- Heavy problem as #1 feature (63% importance)
- Time-based criticality scoring

### Data
- 5,000 training samples (was 1,000)
- 5-year worth of patterns
- 76% SLA breach rate in dataset

---

## ⚙️ Model Specifications

- **Algorithm**: XGBoost Classifier
- **Train Accuracy**: 99.95%
- **Test Accuracy**: 98.50%
- **Top Feature**: is_heavy_problem (63.10%)
- **Hyperparameters**: Optimized with regularization

---

## 🔗 Running the Full Stack

```bash
# Terminal 1: Start frontend
streamlit run app.py

# Terminal 2: Run tests
python test_model.py

# Terminal 3: Monitor model
python -c "import joblib; m=joblib.load('sla_score_predictor.pkl'); print(f'Model loaded! Baseline SLA: {m.baseline_sla:.2f}%')"
```

---

## 📞 Support

For issues:
1. Check `README.md` for detailed docs
2. Review `ENHANCEMENT_SUMMARY.md` for technical details
3. Run `test_model.py` to validate setup

---

**Status**: 🟢 Production Ready  
**Last Updated**: March 15, 2026  
**Accuracy**: 98.50% ✅  
**Heavy Problem Detection**: Enabled ⚠️
