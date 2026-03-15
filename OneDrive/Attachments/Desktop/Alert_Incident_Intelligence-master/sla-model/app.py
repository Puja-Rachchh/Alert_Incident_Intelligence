import os
from flask import Flask, request, jsonify, render_template
import joblib
import pandas as pd

app = Flask(__name__)

# Load the model and feature columns
MODEL_PATH = 'sla_prediction_model.pkl'
FEATURES_PATH = 'feature_columns.pkl'

try:
    model = joblib.load(MODEL_PATH)
    feature_columns = joblib.load(FEATURES_PATH)
    print("Model and features loaded successfully.")
except Exception as e:
    print(f"Error loading model or features: {e}")
    model = None
    feature_columns = None


@app.route('/')
def index():
    """Serve the main frontend page."""
    # Pass feature columns to the template to generate form fields dynamically if needed
    return render_template('index.html', features=feature_columns if feature_columns else [])

@app.route('/predict', methods=['POST'])
def predict():
    """API endpoint to predict SLA breach."""
    if not model or not feature_columns:
         return jsonify({'error': 'Prediction model is not available.'}), 500

    try:
        # Get data from the request
        data = request.json
        
        # Create a DataFrame from the input data, ensuring it has only one row
        input_df = pd.DataFrame([data])
        
        # Ensure all columns match the expected features by the model
        # Fill missing features with 0 (or appropriate default)
        for col in feature_columns:
            if col not in input_df.columns:
                input_df[col] = 0
                
        # Reorder columns to match feature_columns exactly
        input_df = input_df[feature_columns]

        # Make prediction
        prediction = model.predict(input_df)[0]
        # Get probability of class 1 (SLA Breach)
        probability = model.predict_proba(input_df)[0][1]

        # Prepare response
        result = {
            'predicted_breach_flag': int(prediction),
            'breach_probability': float(probability),
            'risk_level': 'High' if probability > 0.5 else 'Medium' if probability >= 0.2 else 'Low'
        }

        return jsonify(result)

    except Exception as e:
        return jsonify({'error': str(e)}), 400


if __name__ == '__main__':
    # Ensure templates and static folders exist
    os.makedirs('templates', exist_ok=True)
    os.makedirs('static', exist_ok=True)
    app.run(debug=True, host='0.0.0.0', port=5000)
