import axios from 'axios';

// Adresa e serverit tuaj (Mund të jetë localhost ose adresa e production në Railway)
const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.0.147:8000'; 

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
});

export const EnergyAPI = {
  // Parashikimi i konsumit
  getPrediction: async (householdSize, homeType, lastKwh) => {
    try {
      const response = await api.post(`/predict?household_size=${householdSize}&home_type=${homeType}&last_kwh=${lastKwh}`);
      return response.data;
    } catch (error) {
      console.error('Prediction Error:', error);
      throw error;
    }
  },

  // Skanimi i faturës
  scanBill: async (imageUri) => {
    const formData = new FormData();
    formData.append('file', {
      uri: imageUri,
      name: 'bill.jpg',
      type: 'image/jpeg',
    });

    try {
      const response = await api.post('/scan-bill', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    } catch (error) {
      console.error('Scan Error:', error);
      throw error;
    }
  },

  // Marrja e këshillave AI
  getInsights: async (userId) => {
    try {
      const response = await api.get(`/insights/${userId}`);
      return response.data;
    } catch (error) {
      // Bypassing console.error for smooth demo
      throw error;
    }
  },

  // Regjistrimi i përdoruesit
  register: async (userData) => {
    try {
      const response = await api.post('/register', userData);
      return response.data;
    } catch (error) {
      // Bypassing console.error for smooth demo
      throw error;
    }
  }
};

export default api;
