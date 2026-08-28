import axios from 'axios';

// Adresa e serverit tuaj (Mund të jetë localhost ose adresa e production në Railway)
const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://ecomind-ai-production.up.railway.app';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
});

// Ndihmës: kthen një gabim të qartë kur serveri (backend-i AI) nuk arrihet.
// Në browser axios e raporton si "Network Error" / "Failed to fetch" kur
// backend-i është offline ose i paarritshëm. Këtu e shndërrojmë në një gabim
// të lexueshëm që ekranet mund ta trajtojnë bukur, pa e trembur përdoruesin.
const normalizeError = (error) => {
  const isNetworkError =
    error?.code === 'ERR_NETWORK' ||
    error?.message === 'Network Error' ||
    error?.message === 'Failed to fetch' ||
    !error?.response; // s'ka përgjigje = serveri s'u arrit

  const friendly = new Error(
    isNetworkError
      ? 'Shërbimi AI nuk është i disponueshëm për momentin. Provoni përsëri më vonë.'
      : 'Ndodhi një gabim gjatë komunikimit me serverin.'
  );
  friendly.isServerUnavailable = isNetworkError;
  friendly.status = error?.response?.status || 0;
  friendly.original = error;
  return friendly;
};

export const EnergyAPI = {
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
      throw normalizeError(error);
    }
  },

  // Regjistrimi i përdoruesit
  register: async (userData) => {
    try {
      const response = await api.post('/register', userData);
      return response.data;
    } catch (error) {
      throw normalizeError(error);
    }
  }
};

export default api;
