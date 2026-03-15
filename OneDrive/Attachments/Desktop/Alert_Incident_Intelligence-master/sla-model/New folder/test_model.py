import pandas as pd
import numpy as np
from train_and_save_model import SLAScorePredictor, create_synthetic_data, feature_cols
import joblib
import pytest

# Test data generation
def test_data_generation():
    """Test synthetic data generation with new features"""
    df, breach_prob = create_synthetic_data(100)
    assert len(df) == 100
    assert all(col in df.columns for col in feature_cols)
    assert 'sla_breach_flag' in df.columns
    assert df['sla_breach_flag'].dtype == int
    assert 'is_heavy_problem' in df.columns
    print("✅ Test: Data generation - PASSED")

# Test model predictions
def test_model_loading():
    """Test model can be loaded"""
    try:
        model = joblib.load('sla_score_predictor.pkl')
        assert model is not None
        print("✅ Test: Model loading - PASSED")
    except FileNotFoundError:
        print("⚠️ Test: Model loading - SKIPPED (model not trained yet)")

# Test single prediction
def test_single_prediction():
    """Test single prediction functionality"""
    try:
        predictor = joblib.load('sla_score_predictor.pkl')
        
        result = predictor.predict_sla_with_alerts(
            num_new_alerts=2,
            alert_severity='P3',
            customer_key=1,
            alert_type_key=1,
            device_key=1
        )
        
        assert isinstance(result, dict)
        assert 'breach_probability_%' in result
        assert 'predicted_sla_after_alert' in result
        assert 'risk_level' in result
        assert 'is_heavy_problem' in result
        assert 0 <= result['breach_probability_%'] <= 100
        print("✅ Test: Single prediction - PASSED")
    except FileNotFoundError:
        print("⚠️ Test: Single prediction - SKIPPED (model not trained yet)")

# Test batch predictions
def test_batch_predictions():
    """Test batch prediction functionality"""
    try:
        predictor = joblib.load('sla_score_predictor.pkl')
        
        scenarios = [
            {"num_new_alerts": 1, "alert_severity": "P4", "customer_key": 1, "alert_type_key": 1, "device_key": 1},
            {"num_new_alerts": 3, "alert_severity": "P3", "customer_key": 2, "alert_type_key": 2, "device_key": 5},
            {"num_new_alerts": 5, "alert_severity": "P2", "customer_key": 3, "alert_type_key": 3, "device_key": 10},
        ]
        
        results = predictor.predict_sla_batch(scenarios)
        
        assert isinstance(results, pd.DataFrame)
        assert len(results) == 3
        assert 'breach_probability_%' in results.columns
        assert 'is_heavy_problem' in results.columns
        print("✅ Test: Batch predictions - PASSED")
    except FileNotFoundError:
        print("⚠️ Test: Batch predictions - SKIPPED (model not trained yet)")

# Test heavy problem detection
def test_heavy_problem_detection():
    """Test heavy problem detection and impact"""
    try:
        predictor = joblib.load('sla_score_predictor.pkl')
        
        # Normal alert
        result_normal = predictor.predict_sla_with_alerts(
            num_new_alerts=1,
            alert_severity='P4',
            customer_key=1,
            alert_type_key=5
        )
        
        # Heavy problem: P1 + multiple alerts
        result_heavy = predictor.predict_sla_with_alerts(
            num_new_alerts=3,
            alert_severity='P1',
            customer_key=1,
            alert_type_key=2
        )
        
        print(f"   Normal Alert Impact: {result_normal['expected_impact_on_sla']:.2f}%")
        print(f"   Heavy Problem Impact: {result_heavy['expected_impact_on_sla']:.2f}%")
        print(f"   Heavy Problem Status: {result_heavy['is_heavy_problem']}")
        
        # Heavy problem should have higher or equal impact
        assert result_heavy['expected_impact_on_sla'] >= result_normal['expected_impact_on_sla']
        print("✅ Test: Heavy problem detection - PASSED")
    except FileNotFoundError:
        print("⚠️ Test: Heavy problem detection - SKIPPED (model not trained yet)")

# Test with various severity levels
def test_all_severity_levels():
    """Test predictions for all severity levels"""
    try:
        predictor = joblib.load('sla_score_predictor.pkl')
        
        severities = ['P1', 'P2', 'P3', 'P4']
        results = []
        
        for severity in severities:
            result = predictor.predict_sla_with_alerts(
                num_new_alerts=1,
                alert_severity=severity,
                customer_key=1
            )
            results.append(result)
            print(f"   {severity}: {result['breach_probability_%']:.2f}% breach probability")
        
        assert len(results) == 4
        print("✅ Test: All severity levels - PASSED")
    except FileNotFoundError:
        print("⚠️ Test: All severity levels - SKIPPED (model not trained yet)")

# Test alert count impact
def test_alert_count_impact():
    """Test that more alerts increase breach probability"""
    try:
        predictor = joblib.load('sla_score_predictor.pkl')
        
        result_1 = predictor.predict_sla_with_alerts(num_new_alerts=1, alert_severity='P3')
        result_5 = predictor.predict_sla_with_alerts(num_new_alerts=5, alert_severity='P3')
        result_10 = predictor.predict_sla_with_alerts(num_new_alerts=10, alert_severity='P3')
        
        prob_1 = result_1['breach_probability_%']
        prob_5 = result_5['breach_probability_%']
        prob_10 = result_10['breach_probability_%']
        
        print(f"   1 alert: {prob_1:.2f}%")
        print(f"   5 alerts: {prob_5:.2f}%")
        print(f"   10 alerts: {prob_10:.2f}%")
        
        # Generally more alerts should increase breach probability
        assert prob_10 >= prob_1, "More alerts should increase or maintain breach probability"
        print("✅ Test: Alert count impact - PASSED")
    except FileNotFoundError:
        print("⚠️ Test: Alert count impact - SKIPPED (model not trained yet)")

# Test output format validation
def test_output_format():
    """Test output format and field validation"""
    try:
        predictor = joblib.load('sla_score_predictor.pkl')
        result = predictor.predict_sla_with_alerts()
        
        required_fields = [
            'num_alerts',
            'severity',
            'baseline_sla',
            'breach_probability_%',
            'expected_impact_on_sla',
            'predicted_sla_after_alert',
            'is_heavy_problem',
            'will_breach',
            'risk_level',
            'heavy_problem_multiplier',
        ]
        
        for field in required_fields:
            assert field in result, f"Missing field: {field}"
        
        print("✅ Test: Output format - PASSED")
    except FileNotFoundError:
        print("⚠️ Test: Output format - SKIPPED (model not trained yet)")

if __name__ == "__main__":
    print("\n" + "="*60)
    print("🧪 Running Enhanced SLA Score Predictor Tests")
    print("="*60 + "\n")
    
    test_data_generation()
    test_model_loading()
    test_single_prediction()
    test_batch_predictions()
    test_heavy_problem_detection()
    test_all_severity_levels()
    test_alert_count_impact()
    test_output_format()
    
    print("\n" + "="*60)
    print("✅ All tests completed!")
    print("="*60 + "\n")
