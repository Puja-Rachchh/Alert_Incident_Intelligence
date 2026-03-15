import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder
import joblib
import warnings
warnings.filterwarnings('ignore')

print('Loading data...')
df = pd.read_csv(r"C:\Users\272749\Downloads\fact_sla_predictions.csv")

print('Preprocessing data...')
# Identify categorical columns
categorical_cols = df.select_dtypes(include=['object', 'bool']).columns
# Remove columns that shouldn't be used as features or are target variables
cols_to_exclude = ['sla_id', 'alert_id', 'fingerprint', 'alert_created_at', 
                   'alert_acknowledged_at', 'alert_resolved_at', 'response_meets_sla', 
                   'resolution_meets_sla', 'overall_sla_met', 'sla_breach_flag']
categorical_cols = [col for col in categorical_cols if col not in cols_to_exclude]

# Label encode categorical features
le_dict = {}
for col in categorical_cols:
    le = LabelEncoder()
    df[col] = le.fit_transform(df[col].astype(str))
    le_dict[col] = le

# Define features (X) and target (y)
X = df.drop(columns=cols_to_exclude)
y = df['sla_breach_flag']

# Save feature columns for future predictions
feature_columns = X.columns.tolist()
joblib.dump(feature_columns, 'feature_columns.pkl')
print(f'Saved {len(feature_columns)} feature columns to feature_columns.pkl')

# Train-test split
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

print('Training Random Forest Classifier...')
model = RandomForestClassifier(n_estimators=100, max_depth=10, random_state=42)
model.fit(X_train, y_train)

# Save the trained model
joblib.dump(model, 'sla_prediction_model.pkl')
print('Saved trained model to sla_prediction_model.pkl')

print('Evaluation on test data:')
accuracy = model.score(X_test, y_test)
print(f'Accuracy: {accuracy*100:.1f}%')
print('Export complete.')
