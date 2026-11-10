import { getResponse } from 'msw';
import { API_BASE } from '../client';
import { handlers } from './handlers';

/** Routes same-page /api requests to the mock handlers without a service worker (static demo build). */
export function installFetchShim() {
  const realFetch = window.fetch.bind(window);
  window.fetch = async (input, init) => {
    const request = new Request(input, init);
    if (new URL(request.url).pathname.includes(`${API_BASE}/`)) {
      const response = await getResponse(handlers, request);
      if (response) return response;
    }
    return realFetch(input, init);
  };
}
