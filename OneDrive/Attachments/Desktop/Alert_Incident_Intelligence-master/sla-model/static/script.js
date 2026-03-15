document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('prediction-form');
    const submitBtn = document.getElementById('submit-btn');
    const btnText = submitBtn.querySelector('.btn-text');
    const spinner = document.getElementById('spinner');
    const resultSection = document.getElementById('result-section');
    const riskCircle = document.getElementById('risk-circle');
    const probabilityValue = document.getElementById('probability-value');
    const riskLevelText = document.getElementById('risk-level');
    const predictionText = document.getElementById('prediction-text');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        // UI Loading State
        btnText.classList.add('hidden');
        spinner.classList.remove('hidden');
        submitBtn.disabled = true;

        // Gather form data
        const formData = new FormData(form);
        const data = {};
        for (let [key, value] of formData.entries()) {
            // Attempt to convert to appropriate types
            if (!isNaN(value) && value.trim() !== '') {
                data[key] = Number(value);
            } else {
                data[key] = value;
            }
        }

        try {
            const response = await fetch('/predict', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (response.ok) {
                // Update UI with predictions
                const probPercent = (result.breach_probability * 100).toFixed(1);
                probabilityValue.textContent = `${probPercent}%`;
                
                riskLevelText.textContent = result.risk_level;

                // Reset Risk Classes
                riskCircle.className = 'result-circle';
                riskLevelText.className = '';

                if (result.risk_level === 'High') {
                    riskCircle.classList.add('risk-high');
                    riskLevelText.style.color = 'var(--danger-color)';
                    predictionText.textContent = "Critical Risk! This incident has a high probability of breaching the SLA terms. Immediate action is required to resolve it.";
                } else if (result.risk_level === 'Medium') {
                    riskCircle.classList.add('risk-medium');
                    riskLevelText.style.color = 'var(--warning-color)';
                    predictionText.textContent = "Moderate Risk! This incident might breach the SLA. Keep an eye on the resolution times.";
                } else {
                    riskCircle.classList.add('risk-low');
                    riskLevelText.style.color = 'var(--success-color)';
                    predictionText.textContent = "Low Risk. This incident is expected to be resolved well within the SLA targets.";
                }

                // Show Result Section with animation
                resultSection.classList.remove('hidden');
                // Small delay to allow display:block to apply before animating opacity
                setTimeout(() => {
                    resultSection.classList.add('visible');
                }, 50);

                // Smooth scroll to result
                resultSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

            } else {
                alert(`Error: ${result.error}`);
            }

        } catch (error) {
            console.error('Error during prediction:', error);
            alert('Failed to communicate with the prediction server. Check console for details.');
        } finally {
            // Reset UI Loading State
            btnText.classList.remove('hidden');
            spinner.classList.add('hidden');
            submitBtn.disabled = false;
        }
    });
});
