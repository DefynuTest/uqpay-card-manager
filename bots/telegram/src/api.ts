import axios, { AxiosInstance } from 'axios';
import { config } from './config';

/**
 * Client for calling Card Manager API.
 * Sends x-cm-email and x-cm-domain headers for auth.
 */
function createClient(email: string, domain: string): AxiosInstance {
  return axios.create({
    baseURL: config.cmApiUrl,
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json',
      'x-cm-email': email,
      'x-cm-domain': domain,
    },
  });
}

export async function getSubscription(email: string, domain: string) {
  const client = createClient(email, domain);
  const res = await client.get('/api/v1/subscription');
  return res.data?.data;
}

export async function subscribe(email: string, domain: string) {
  const client = createClient(email, domain);
  const res = await client.post('/api/v1/subscription/subscribe');
  return res.data?.data;
}

export async function unsubscribe(email: string, domain: string) {
  const client = createClient(email, domain);
  const res = await client.post('/api/v1/subscription/unsubscribe');
  return res.data?.data;
}

export async function getCardHealth(email: string, domain: string) {
  const client = createClient(email, domain);
  const res = await client.get('/api/v1/cards/health');
  return res.data?.data;
}

export async function getAnomalies(email: string, domain: string, cardId: string) {
  const client = createClient(email, domain);
  const res = await client.get(`/api/v1/cards/anomalies/${cardId}`);
  return res.data?.data;
}

export async function getStatement(email: string, domain: string, year: number, month: number) {
  const client = createClient(email, domain);
  const res = await client.get(`/api/v1/cards/statement/${year}/${month}`);
  return res.data?.data;
}

export async function getContext(email: string, domain: string) {
  const client = createClient(email, domain);
  const res = await client.get('/api/v1/context');
  return res.data?.data;
}
