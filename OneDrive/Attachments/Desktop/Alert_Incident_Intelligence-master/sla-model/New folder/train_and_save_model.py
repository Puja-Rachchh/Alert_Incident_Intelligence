import pandas as pd
import numpy as np
from datetime import datetime
import joblib
from sklearn.model_selection import train_test_split, GridSearchCV
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
import xgboost as xgb
import warnings
warnings.filterwarnings('ignore')

feature_cols = [
    'num_related_alerts',
    'alert_hour',
    'day_of_week',
    'is_business_hours',
    'customer_key',
    'alert_type_key',
    'device_key',
    'severity_order',
    'is_heavy_problem',
    'alert_frequency_score',
    'critical_time_factor',
]

class SLAScorePredictor:
    """
    Real-time SLA score predictor with heavy problem detection
    """
    
    def __init__(self, model, df_historical):
        self.model = model
        self.df = df_historical
        self.baseline_sla = (df_historical['sla_breach_flag'] == 0).sum() / len(df_historical) * 100
        self.feature_cols = feature_cols
        
    def detect_heavy_problem(self, num_alerts, severity, alert_type_key):
        """
        Detect if this is a heavy/critical problem
        Heavy problems: P1/P2 alerts, multiple critical alerts, or critical alert types
        """
        severity_map = {'P4': 1, 'P3': 2, 'P2': 3, 'P1': 4}
        severity_order = severity_map.get(severity, 2)
        
        is_p1_or_p2 = severity_order >= 3
        is_multiple_alerts = num_alerts >= 5
        is_critical_type = alert_type_key in [1, 2, 3]  # Critical alert types
        
        # Heavy problem if: P1/P2 OR multiple alerts with high severity OR critical type
        is_heavy = (is_p1_or_p2 and num_alerts >= 2) or (is_multiple_alerts and severity_order >= 2) or (is_critical_type and severity_order >= 3)
        
        return 1 if is_heavy else 0
    
    def calculate_alert_frequency_score(self, num_alerts):
        """
        Calculate frequency score based on number of alerts (0-1 scale)
        """
        return min(num_alerts / 20, 1.0)
    
    def calculate_critical_time_factor(self, is_business_hours, alert_hour):
        """
        Critical time factor: business hours are more critical for SLA
        """
        if is_business_hours:
            # Morning and afternoon peaks are more critical
            if (9 <= alert_hour <= 11) or (14 <= alert_hour <= 16):
                return 1.0  # Peak hours
            else:
                return 0.8  # Business hours but not peak
        else:
            return 0.3  # Off-hours are less critical for immediate SLA
        
    def predict_sla_with_alerts(self, 
                                num_new_alerts=1,
                                alert_severity='P3',
                                alert_category='network',
                                customer_key=1,
                                alert_type_key=1,
                                device_key=1,
                                alert_hour=None,
                                day_of_week=None,
                                is_business_hours=None,
                                alert_frequency_score=None,
                                critical_time_factor=None):
        """
        Predicts SLA score with new alerts and detects heavy problems
        
        All 11 features can be specified as inputs:
        - num_related_alerts, alert_hour, day_of_week, is_business_hours
        - customer_key, alert_type_key, device_key, severity_order
        - is_heavy_problem, alert_frequency_score, critical_time_factor
        """
        severity_map = {'P4': 1, 'P3': 2, 'P2': 3, 'P1': 4}
        severity_order = severity_map.get(alert_severity, 2)
        
        # Use provided values or calculate from current time
        now = datetime.now()
        if alert_hour is None:
            alert_hour = now.hour
        if day_of_week is None:
            day_of_week = now.weekday()
        if is_business_hours is None:
            is_business_hours = (now.weekday() < 5) and (8 <= now.hour < 18)
        
        # Detect heavy problem (can override by passing is_heavy_problem)
        is_heavy_problem = self.detect_heavy_problem(num_new_alerts, alert_severity, alert_type_key)
        
        # Calculate scores (can override by passing as parameters)
        if alert_frequency_score is None:
            alert_frequency_score = self.calculate_alert_frequency_score(num_new_alerts)
        if critical_time_factor is None:
            critical_time_factor = self.calculate_critical_time_factor(is_business_hours, alert_hour)
        
        X_pred = pd.DataFrame({
            'num_related_alerts': [num_new_alerts],
            'alert_hour': [alert_hour],
            'day_of_week': [day_of_week],
            'is_business_hours': [int(is_business_hours)],
            'customer_key': [customer_key],
            'alert_type_key': [alert_type_key],
            'device_key': [device_key],
            'severity_order': [severity_order],
            'is_heavy_problem': [is_heavy_problem],
            'alert_frequency_score': [alert_frequency_score],
            'critical_time_factor': [critical_time_factor],
        })
        
        breach_prob = self.model.predict_proba(X_pred)[0][1]
        
        # HEAVY PROBLEM IMPACT: Multiply breach probability if heavy problem
        if is_heavy_problem:
            breach_prob = min(breach_prob * 2.5, 0.99)  # Strong amplification but cap at 0.99
            impact_multiplier = 3.0  # Heavy problems get 3x impact
        else:
            impact_multiplier = 1.0
        
        # Calculate base impact
        base_impact = breach_prob * 5
        
        # Apply multipliers and critical time factor
        impact_points = base_impact * impact_multiplier * critical_time_factor
        predicted_sla_after = self.baseline_sla - impact_points
        
        # Ensure SLA doesn't go negative
        predicted_sla_after = max(predicted_sla_after, 0)
        
        return {
            'num_alerts': num_new_alerts,
            'severity': alert_severity,
            'baseline_sla': round(self.baseline_sla, 2),
            'breach_probability_%': round(breach_prob * 100, 2),
            'expected_impact_on_sla': round(impact_points, 2),
            'predicted_sla_after_alert': round(predicted_sla_after, 2),
            'is_heavy_problem': '⚠️ YES' if is_heavy_problem else 'NO',
            'will_breach': 'YES 🔴' if breach_prob > 0.5 else 'NO ✅',
            'risk_level': 'CRITICAL 🔴' if breach_prob > 0.8 else ('HIGH 🟡' if breach_prob > 0.5 else 'LOW 🟢'),
            'heavy_problem_multiplier': round(impact_multiplier, 1),
        }
    
    def predict_sla_batch(self, scenarios):
        results = []
        for scenario in scenarios:
            result = self.predict_sla_with_alerts(**scenario)
            results.append(result)
        return pd.DataFrame(results)


def create_synthetic_data(n_samples=5000):
    """
    Create high-quality synthetic historical SLA data with strong correlations
    """
    np.random.seed(42)
    
    # Create base features
    data = {
        'num_related_alerts': np.random.randint(0, 15, n_samples),
        'alert_hour': np.random.randint(0, 24, n_samples),
        'day_of_week': np.random.randint(0, 7, n_samples),
        'is_business_hours': np.random.randint(0, 2, n_samples),
        'customer_key': np.random.randint(1, 30, n_samples),
        'alert_type_key': np.random.randint(1, 10, n_samples),
        'device_key': np.random.randint(1, 100, n_samples),
        'severity_order': np.random.randint(1, 5, n_samples),
    }
    
    df = pd.DataFrame(data)
    
    # Create derived features
    df['is_heavy_problem'] = (
        ((df['severity_order'] >= 3) & (df['num_related_alerts'] >= 2)) |
        ((df['num_related_alerts'] >= 5) & (df['severity_order'] >= 2)) |
        ((df['alert_type_key'] <= 3) & (df['severity_order'] >= 3))
    ).astype(int)
    
    df['alert_frequency_score'] = np.minimum(df['num_related_alerts'] / 20, 1.0)
    
    df['critical_time_factor'] = df.apply(
        lambda row: 1.0 if (row['is_business_hours'] == 1 and (9 <= row['alert_hour'] <= 11 or 14 <= row['alert_hour'] <= 16))
        else (0.8 if row['is_business_hours'] == 1 else 0.3),
        axis=1
    )
    
    # Create target variable with STRONG correlation to features
    breach_probability = (
        (df['severity_order'] >= 3).astype(int) * 0.45 +           # High severity: strong impact
        (df['is_heavy_problem'].astype(int)) * 0.50 +              # Heavy problem: very strong impact
        (df['num_related_alerts'] > 7).astype(int) * 0.35 +        # Many alerts: strong impact
        (df['is_business_hours'] == 0).astype(int) * 0.20 +        # Off-hours: some impact
        (df['alert_frequency_score'] * 0.30) +                     # Frequency score
        np.random.uniform(0, 0.15, n_samples)                      # Random noise
    )
    
    df['sla_breach_flag'] = (breach_probability > 0.5).astype(int)
    
    return df, breach_probability


if __name__ == "__main__":
    print("🚀 Training Enhanced SLA Score Predictor Model...")
    print("=" * 60)
    
    # Create synthetic data with better correlations
    df, breach_prob = create_synthetic_data(5000)
    
    print(f"✅ Created synthetic data: {len(df)} samples")
    print(f"   - SLA Breach Rate: {df['sla_breach_flag'].mean()*100:.2f}%")
    print(f"   - Heavy Problems: {df['is_heavy_problem'].sum()} ({df['is_heavy_problem'].mean()*100:.2f}%)")
    
    X = df[feature_cols].copy()
    y = df['sla_breach_flag'].copy()

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    print("\n🔧 Training XGBoost model with optimized hyperparameters...")
    
    # Improved hyperparameters for better accuracy
    model = xgb.XGBClassifier(
        n_estimators=200,           # Increased from 100
        max_depth=7,                # Increased from 5
        learning_rate=0.05,         # Decreased from 0.1 for better learning
        subsample=0.8,              # Add subsampling
        colsample_bytree=0.8,       # Add column sampling
        min_child_weight=1,         # Add regularization
        reg_alpha=0.1,              # L1 regularization
        reg_lambda=1.0,             # L2 regularization
        random_state=42,
        eval_metric='logloss'
    )
    
    model.fit(
        X_train, y_train, 
        eval_set=[(X_test, y_test)], 
        verbose=False
    )

    train_score = model.score(X_train, y_train)
    test_score = model.score(X_test, y_test)
    
    print(f"\n📊 Model Performance:")
    print(f"   - Train Accuracy: {train_score:.4f} ({train_score*100:.2f}%)")
    print(f"   - Test Accuracy:  {test_score:.4f} ({test_score*100:.2f}%)")
    
    # Feature importance
    feature_importance = pd.DataFrame({
        'feature': feature_cols,
        'importance': model.feature_importances_
    }).sort_values('importance', ascending=False)
    
    print(f"\n🎯 Top Features by Importance:")
    for idx, row in feature_importance.head(5).iterrows():
        print(f"   {row['feature']}: {row['importance']:.4f}")

    # Create predictor and save
    predictor = SLAScorePredictor(model, df)
    
    # Save both model and predictor
    joblib.dump(model, 'sla_score_predictor_model.pkl')
    joblib.dump(predictor, 'sla_score_predictor.pkl')
    joblib.dump(feature_cols, 'feature_cols.pkl')
    
    print("\n" + "=" * 60)
    print("✅ Model saved successfully!")
    print("   - sla_score_predictor_model.pkl (XGBoost model)")
    print("   - sla_score_predictor.pkl (SLAScorePredictor with heavy problem detection)")
    print("   - feature_cols.pkl (feature list)")
    print("=" * 60)
