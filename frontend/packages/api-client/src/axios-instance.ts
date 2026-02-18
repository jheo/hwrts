import axios from 'axios';
import type { AxiosRequestConfig } from 'axios';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080';

export const axiosInstance = axios.create({
  baseURL: BACKEND_URL,
  withCredentials: true, // httpOnly cookies
});

export const customInstance = <T>(config: AxiosRequestConfig): Promise<T> => {
  const promise = axiosInstance(config).then(({ data }) => data);
  return promise;
};

export default customInstance;
