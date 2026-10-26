import type { SessionContext } from '../domain/models.generated';

export function createSession(): SessionContext {
  const cryptoApi = globalThis.crypto;
  const id = cryptoApi?.randomUUID ? cryptoApi.randomUUID() : `${Date.now()}-${Math.random()}`;
  return { id: `ses_${id}` };
}
