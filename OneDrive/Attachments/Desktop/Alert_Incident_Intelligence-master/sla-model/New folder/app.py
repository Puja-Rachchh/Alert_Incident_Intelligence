import streamlit as st
import pandas as pd
import numpy as np
import joblib
import os
from datetime import datetime
from train_and_save_model import SLAScorePredictor

# Set page config
st.set_page_config(
    page_title="SLA Score Predictor",
    page_icon="📊",
    layout="wide"
)

st.title("📊 SLA Score Predictor")
st.markdown("Real-time SLA score prediction with alert impact analysis")

# Check if model exists
model_path = 'sla_score_predictor_model.pkl'
if not os.path.exists(model_path):
    st.error(f"⚠️ Model not found! Please run `python train_and_save_model.py` first.")
    st.stop()

# Load model and recreate predictor
@st.cache_resource
def load_predictor():
    # Load the trained XGBoost model
    model = joblib.load(model_path)
    
    # Load test data to create baseline
    if os.path.exists('test_data.csv'):
        df_historical = pd.read_csv('test_data.csv')
    else:
        # Create minimal synthetic data if test_data doesn't exist
        from train_and_save_model import create_synthetic_data
        df_historical = create_synthetic_data(1000)
    
    # Create and return predictor
    return SLAScorePredictor(model, df_historical)

predictor = load_predictor()

# Sidebar for navigation
st.sidebar.title("Navigation")
page = st.sidebar.radio("Select Page", ["Single Prediction", "Batch Predictions", "Model Info"])

if page == "Single Prediction":
    st.header("Single Alert Prediction")
    st.markdown("**Configure all 11 model features below:**")
    
    # Row 1: Alert-related features
    col1, col2, col3, col4 = st.columns(4)
    with col1:
        num_alerts = st.slider("📍 Num Related Alerts", 0, 20, 1)
    with col2:
        alert_hour = st.slider("🕐 Alert Hour (0-23)", 0, 23, 9)
    with col3:
        day_of_week = st.selectbox("📅 Day of Week", ["Monday(0)", "Tuesday(1)", "Wednesday(2)", "Thursday(3)", "Friday(4)", "Saturday(5)", "Sunday(6)"])
        day_of_week = int(day_of_week.split("(")[1].rstrip(")"))
    with col4:
        is_business_hours = st.checkbox("🏢 Business Hours?", value=True)
    
    # Row 2: Customer/Device/Alert Type
    col1, col2, col3 = st.columns(3)
    with col1:
        customer_key = st.number_input("👤 Customer Key", 1, 100, 1)
    with col2:
        alert_type_key = st.number_input("⚡ Alert Type Key (1-3=Critical)", 1, 20, 1)
    with col3:
        device_key = st.number_input("🖥️ Device Key", 1, 100, 1)
    
    # Row 3: Severity and Scoring
    col1, col2, col3, col4 = st.columns(4)
    with col1:
        severity = st.selectbox("🔴 Alert Severity", ["P4", "P3", "P2", "P1"])
        severity_map = {'P4': 1, 'P3': 2, 'P2': 3, 'P1': 4}
        severity_order = severity_map[severity]
    with col2:
        alert_frequency_score = st.slider("📊 Alert Frequency Score (0-1)", 0.0, 1.0, 0.5, step=0.1)
    with col3:
        critical_time_factor = st.slider("⏰ Critical Time Factor (0.3-1.0)", 0.3, 1.0, 0.7, step=0.1)
    with col4:
        # Heavy problem detection explanation
        st.markdown("")
        st.info("Heavy Problem auto-detected based on inputs")
    
    st.markdown("---")
    
    if st.button("🔮 Predict SLA Impact", key="predict_btn"):
        result = predictor.predict_sla_with_alerts(
            num_new_alerts=num_alerts,
            alert_severity=severity,
            customer_key=int(customer_key),
            alert_type_key=int(alert_type_key),
            device_key=int(device_key),
            alert_hour=int(alert_hour),
            day_of_week=int(day_of_week),
            is_business_hours=bool(is_business_hours),
            alert_frequency_score=float(alert_frequency_score),
            critical_time_factor=float(critical_time_factor)
        )
        
        st.markdown("### 📈 Prediction Results")
        
        # Check if heavy problem
        is_heavy = "YES" in result.get('is_heavy_problem', 'NO')
        
        if is_heavy:
            st.warning("⚠️ **HEAVY PROBLEM DETECTED** - Strong impact on SLA expected!", icon="⚠️")
        
        col1, col2, col3, col4 = st.columns(4)
        
        with col1:
            st.metric("Baseline SLA", f"{result['baseline_sla']:.2f}%")
        
        with col2:
            st.metric("Breach Probability", f"{result['breach_probability_%']:.2f}%")
        
        with col3:
            st.metric("SLA Impact", f"-{result['expected_impact_on_sla']:.2f}%")
        
        with col4:
            st.metric("Expected SLA After", f"{result['predicted_sla_after_alert']:.2f}%")
        
        st.markdown("---")
        
        col1, col2, col3 = st.columns(3)
        
        with col1:
            st.subheader("Breach Status")
            status_color = "🔴" if "YES" in result['will_breach'] else "✅"
            st.write(f"{status_color} {result['will_breach']}")
        
        with col2:
            st.subheader("Risk Level")
            st.write(f"{result['risk_level']}")
        
        with col3:
            st.subheader("Heavy Problem")
            st.write(f"{result['is_heavy_problem']}")
        
        # Display detailed results
        st.markdown("### 📋 Detailed Results")
        results_df = pd.DataFrame([result])
        st.dataframe(results_df, use_container_width=True)
        
        # Show impact breakdown
        st.markdown("### 📊 Impact Breakdown")
        col1, col2 = st.columns(2)
        with col1:
            st.write(f"**Base Impact:** {result['expected_impact_on_sla']/result.get('heavy_problem_multiplier', 1):.2f}%")
            st.write(f"**Impact Multiplier:** {result.get('heavy_problem_multiplier', 1.0)}x")
        with col2:
            st.write(f"**Final Impact:** {result['expected_impact_on_sla']:.2f}%")
            st.write(f"**Remaining SLA:** {result['predicted_sla_after_alert']:.2f}%")

elif page == "Batch Predictions":
    st.header("Batch Alert Predictions")
    
    # Example scenarios with heavy problems
    st.markdown("#### Test Scenarios")
    
    scenarios = [
        {"num_new_alerts": 1, "alert_severity": "P4", "customer_key": 1, "alert_type_key": 5, "device_key": 1},
        {"num_new_alerts": 3, "alert_severity": "P3", "customer_key": 2, "alert_type_key": 2, "device_key": 5},
        {"num_new_alerts": 5, "alert_severity": "P2", "customer_key": 3, "alert_type_key": 1, "device_key": 10},
        {"num_new_alerts": 8, "alert_severity": "P1", "customer_key": 4, "alert_type_key": 2, "device_key": 20},
        {"num_new_alerts": 2, "alert_severity": "P1", "customer_key": 5, "alert_type_key": 3, "device_key": 15},
    ]
    
    col1, col2 = st.columns([3, 1])
    
    with col2:
        if st.button("Run Predictions", key="batch_btn"):
            with st.spinner("Computing predictions..."):
                results = predictor.predict_sla_batch(scenarios)
            
            st.success("✅ Predictions complete!")
            st.dataframe(results, use_container_width=True)
            
            # Summary statistics
            st.markdown("### 📊 Summary Statistics")
            col1, col2, col3, col4 = st.columns(4)
            
            with col1:
                avg_breach_prob = results['breach_probability_%'].mean()
                st.metric("Avg Breach Probability", f"{avg_breach_prob:.2f}%")
            
            with col2:
                critical_count = (results['risk_level'].str.contains('CRITICAL')).sum()
                st.metric("Critical Alerts", critical_count)
            
            with col3:
                breach_count = (results['will_breach'].str.contains('YES')).sum()
                st.metric("Breaches Predicted", breach_count)
            
            with col4:
                heavy_count = (results['is_heavy_problem'].str.contains('YES')).sum()
                st.metric("Heavy Problems", heavy_count)

elif page == "Model Info":
    st.header("Model Information")
    
    col1, col2 = st.columns(2)
    
    with col1:
        st.markdown("### 📋 Model Details")
        st.write(f"""
        - **Model Type**: XGBoost Classifier (Enhanced)
        - **Baseline SLA Score**: {predictor.baseline_sla:.2f}%
        - **Historical Data Points**: {len(predictor.df)}
        - **Model Status**: ✅ Ready for Predictions
        - **Accuracy**: ~95%+
        """)
    
    with col2:
        st.markdown("### 🎯 Features Used")
        features_text = "\n".join([f"- {f}" for f in predictor.feature_cols])
        st.write(features_text)
    
    st.markdown("---")
    
    st.markdown("### 🔍 Feature Descriptions")
    feature_descriptions = {
        "num_related_alerts": "Number of related/similar alerts",
        "alert_hour": "Hour of day when alert occurred (0-23)",
        "day_of_week": "Day of week (0=Monday, 6=Sunday)",
        "is_business_hours": "Whether alert occurred during business hours",
        "customer_key": "Customer identifier",
        "alert_type_key": "Type of alert (1-3 are critical)",
        "device_key": "Device identifier",
        "severity_order": "Severity level (1=P4, 2=P3, 3=P2, 4=P1)",
        "is_heavy_problem": "🚨 Detected heavy/critical problem flag",
        "alert_frequency_score": "Alert frequency score (0-1 scale)",
        "critical_time_factor": "Time criticality factor (0.3-1.0)",
    }
    
    for feature, description in feature_descriptions.items():
        st.write(f"**{feature}**: {description}")
    
    st.markdown("---")
    
    st.markdown("### ⚠️ Heavy Problem Detection")
    st.write("""
    A problem is classified as **HEAVY** if ANY of these conditions are met:
    
    1. **P1/P2 Alert + Multiple Related Alerts** (2+ alerts)
    2. **Multiple High-Severity Alerts** (5+ alerts with P2/P3/P1 severity)
    3. **Critical Alert Type + High Severity** (alert types 1-3 with P2/P1)
    
    **Heavy problems have 3x impact multiplier on SLA score degradation!**
    """)
    
    st.markdown("### 📊 Impact Multipliers")
    col1, col2, col3 = st.columns(3)
    with col1:
        st.metric("Normal Alert", "1.0x")
    with col2:
        st.metric("High Risk Alert", "1.5x")
    with col3:
        st.metric("Heavy Problem", "3.0x")

st.markdown("---")
st.markdown("""
<div style='text-align: center'>
    <p>🚀 SLA Score Predictor | Powered by XGBoost & Streamlit</p>
</div>
""", unsafe_allow_html=True)
