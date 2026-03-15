import pandas as pd
import numpy as np

# Create test dataset with enhanced features
np.random.seed(42)

n_samples = 500

test_data = {
    'num_related_alerts': np.random.randint(0, 10, n_samples),
    'alert_hour': np.random.randint(0, 24, n_samples),
    'day_of_week': np.random.randint(0, 7, n_samples),
    'is_business_hours': np.random.randint(0, 2, n_samples),
    'customer_key': np.random.randint(1, 20, n_samples),
    'alert_type_key': np.random.randint(1, 10, n_samples),
    'device_key': np.random.randint(1, 50, n_samples),
    'severity_order': np.random.randint(1, 5, n_samples),
}

df_test = pd.DataFrame(test_data)

# Add derived features
df_test['is_heavy_problem'] = (
    ((df_test['severity_order'] >= 3) & (df_test['num_related_alerts'] >= 2)) |
    ((df_test['num_related_alerts'] >= 5) & (df_test['severity_order'] >= 2)) |
    ((df_test['alert_type_key'] <= 3) & (df_test['severity_order'] >= 3))
).astype(int)

df_test['alert_frequency_score'] = np.minimum(df_test['num_related_alerts'] / 20, 1.0)

df_test['critical_time_factor'] = df_test.apply(
    lambda row: 1.0 if (row['is_business_hours'] == 1 and (9 <= row['alert_hour'] <= 11 or 14 <= row['alert_hour'] <= 16))
    else (0.8 if row['is_business_hours'] == 1 else 0.3),
    axis=1
)

# Create target variable with correlation
df_test['sla_breach_flag'] = (
    (df_test['severity_order'] >= 3).astype(int) * 0.4 +
    (df_test['is_heavy_problem'].astype(int)) * 0.5 +
    (df_test['num_related_alerts'] > 5).astype(int) * 0.3 +
    (df_test['is_business_hours'] == 0).astype(int) * 0.2 +
    np.random.uniform(0, 0.1, n_samples)
) > 0.5

df_test['sla_breach_flag'] = df_test['sla_breach_flag'].astype(int)

# Save to CSV
df_test.to_csv('test_data.csv', index=False)
print(f"✅ Enhanced test data created: test_data.csv ({n_samples} rows)")
print("\nFirst 5 rows:")
print(df_test.head())
print(f"\nDataset shape: {df_test.shape}")
print(f"SLA Breach Rate: {df_test['sla_breach_flag'].mean()*100:.2f}%")
print(f"Heavy Problems: {df_test['is_heavy_problem'].sum()} ({df_test['is_heavy_problem'].mean()*100:.2f}%)")
