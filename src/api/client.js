import axios from "axios";

const API_URL = `/api/v1`;

const apiClient = axios.create({
    baseURL: API_URL,
    headers:{
        'Content-Type' : 'application/json',
    },
    withCredentials: true
});

apiClient.interceptors.response.use(
    (response) => response, 
    (error) => {
        console.error("API Error:", error.response ? error.response.data : error.message);
        return Promise.reject(error);
    }
);

export default apiClient;


