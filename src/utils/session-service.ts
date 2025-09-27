import { nanoid } from "nanoid";
import { getRedisClient } from "./redis";
import { Session, SessionMetadata, SessionSignal, SessionStatus } from "../schema/sessionSchema";
import { RedisClientType } from "redis";

const SESSION_METADATA_PREFIX = "session:meta:";
const SESSION_SIGNAL_PREFIX = "session:signal:";
const INITIAL_TTL = 120; // 2 minutes in seconds
const JOINED_TTL = 45; // 45 seconds in seconds

export class SessionService {
  private redis: RedisClientType | null;

  constructor() {
    this.redis = null;
  }

  private async getRedis() {
    if (!this.redis) {
      this.redis = await getRedisClient();
    }
    return this.redis;
  }

  async createSession(host: string): Promise<Session> {
    const redis = await this.getRedis();
    const id = nanoid();
    const createdAt = new Date().toISOString();

    const metadata: SessionMetadata = {
      id,
      host,
      client: "",
      status: SessionStatus.WAITING,
      createdAt,
    };

    const signal: SessionSignal = {};

    // Store metadata as hash with individual field-value pairs
    await redis.hSet(`${SESSION_METADATA_PREFIX}${id}`, {
      id,
      host,
      client: "",
      status: SessionStatus.WAITING,
      createdAt,
    });

    // Store signal as JSON string
    await redis.set(`${SESSION_SIGNAL_PREFIX}${id}`, JSON.stringify(signal));

    // Set TTL for both keys
    await redis.expire(`${SESSION_METADATA_PREFIX}${id}`, INITIAL_TTL);
    await redis.expire(`${SESSION_SIGNAL_PREFIX}${id}`, INITIAL_TTL);

    return { ...metadata, signal };
  }

  async joinSession(id: string, client: string): Promise<Session | null> {
    const redis = await this.getRedis();

    // Get current metadata
    const metadataExists = await redis.exists(`${SESSION_METADATA_PREFIX}${id}`);
    if (!metadataExists) {
      return null;
    }

    const metadataRaw = await redis.hGetAll(`${SESSION_METADATA_PREFIX}${id}`);
    const metadata = metadataRaw as unknown as SessionMetadata;

    if (metadata.status !== SessionStatus.WAITING) {
      return null;
    }

    // Update metadata with individual field updates
    await redis.hSet(`${SESSION_METADATA_PREFIX}${id}`, {
      client,
      status: SessionStatus.JOINED,
    });

    // Reset TTL to 45 seconds
    await redis.expire(`${SESSION_METADATA_PREFIX}${id}`, JOINED_TTL);
    await redis.expire(`${SESSION_SIGNAL_PREFIX}${id}`, JOINED_TTL);

    const signalData = await redis.get(`${SESSION_SIGNAL_PREFIX}${id}`);
    const signal: SessionSignal = signalData ? JSON.parse(signalData) : {};

    const updatedMetadata: SessionMetadata = {
      ...metadata,
      client,
      status: SessionStatus.JOINED,
    };

    return { ...updatedMetadata, signal };
  }

  async getSession(id: string): Promise<Session | null> {
    const redis = await this.getRedis();

    const metadataExists = await redis.exists(`${SESSION_METADATA_PREFIX}${id}`);
    if (!metadataExists) {
      return null;
    }

    const metadataRaw = await redis.hGetAll(`${SESSION_METADATA_PREFIX}${id}`);
    const metadata = metadataRaw as unknown as SessionMetadata;
    const signalData = await redis.get(`${SESSION_SIGNAL_PREFIX}${id}`);
    const signal: SessionSignal = signalData ? JSON.parse(signalData) : {};

    return { ...metadata, signal };
  }

  async addSignal(id: string, type: "offer" | "answer", sdp: string, candidate: string[]): Promise<Session | null> {
    const redis = await this.getRedis();

    const session = await this.getSession(id);
    if (!session || session.status !== SessionStatus.JOINED) {
      return null;
    }

    // Update signal
    const updatedSignal = { ...session.signal };
    updatedSignal[type] = { sdp, candidate };

    // Update status to signaling
    await redis.hSet(`${SESSION_METADATA_PREFIX}${id}`, {
      status: SessionStatus.SIGNALING,
    });
    await redis.set(`${SESSION_SIGNAL_PREFIX}${id}`, JSON.stringify(updatedSignal));

    const updatedMetadata: SessionMetadata = {
      ...session,
      status: SessionStatus.SIGNALING,
    };

    return { ...updatedMetadata, signal: updatedSignal };
  }

  async waitForJoin(id: string, timeoutMs = 5000): Promise<Session | null> {
    const startTime = Date.now();
    const checkInterval = 500; // 500ms

    while (Date.now() - startTime < timeoutMs) {
      const session = await this.getSession(id);
      if (!session) {
        return null;
      }

      if (session.status !== SessionStatus.WAITING) {
        return session;
      }

      await new Promise((resolve) => setTimeout(resolve, checkInterval));
    }

    return null;
  }

  async waitForSignal(
    id: string,
    type: "offer" | "answer",
    timeoutMs = 5000
  ): Promise<{ sdp: string; candidate: string[] } | null> {
    const startTime = Date.now();
    const checkInterval = 200; // 200ms

    while (Date.now() - startTime < timeoutMs) {
      const session = await this.getSession(id);
      if (!session) {
        return null;
      }

      if (session.signal[type]) {
        return session.signal[type]!;
      }

      await new Promise((resolve) => setTimeout(resolve, checkInterval));
    }

    return null;
  }
}

export const sessionService = new SessionService();
