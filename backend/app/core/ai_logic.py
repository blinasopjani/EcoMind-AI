import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor
import joblib
import os

class EnergyPredictor:
    def __init__(self):
        self.model = RandomForestRegressor(n_estimators=100, random_state=42)
        # Store model next to this file so Docker / Railway paths always resolve correctly
        _here = os.path.dirname(os.path.abspath(__file__))
        self.model_path = os.path.join(_here, "energy_model.joblib")

    def train_initial_model(self):
        # Mock data for training (Household size, Home type, Previous Month kWh)
        # 0: Apartment, 1: House
        data = {
            'household_size': [1, 2, 3, 4, 2, 5, 3, 4, 1, 2],
            'home_type': [0, 0, 1, 1, 0, 1, 0, 1, 0, 1],
            'prev_month_kwh': [150, 250, 450, 600, 280, 800, 320, 550, 120, 300],
            'target_kwh': [160, 240, 470, 580, 290, 820, 310, 560, 130, 310]
        }
        df = pd.DataFrame(data)
        X = df[['household_size', 'home_type', 'prev_month_kwh']]
        y = df['target_kwh']
        
        self.model.fit(X, y)
        joblib.dump(self.model, self.model_path)

    def predict_next_month(self, household_size, home_type_str, last_kwh):
        if not os.path.exists(self.model_path):
            self.train_initial_model()
        
        model = joblib.load(self.model_path)
        home_type = 1 if home_type_str.lower() == "house" else 0
        
        prediction = model.predict([[household_size, home_type, last_kwh]])
        return round(float(prediction[0]), 2)

predictor = EnergyPredictor()
