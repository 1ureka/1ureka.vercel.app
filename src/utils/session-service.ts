import { nanoid } from "nanoid";
import { Session, SessionMetadata, SessionSignal } from "../schema/sessionSchema";
import { createClient } from "redis";

const SESSION_METADATA_PREFIX = "session:meta:";
const SESSION_SIGNAL_PREFIX = "session:signal:";
const INITIAL_TTL = 120; // 2 minutes in seconds
const JOINED_TTL = 45; // 45 seconds in seconds

const redisPromise = createClient({ url: process.env.REDIS_URL }).connect();

async function getSession(id: string): Promise<Session | null> {
  const redis = await redisPromise;

  const metadataExists = await redis.exists(`${SESSION_METADATA_PREFIX}${id}`);
  if (!metadataExists) return null;

  const metadataRaw = await redis.hGetAll(`${SESSION_METADATA_PREFIX}${id}`);
  const metadata = metadataRaw as unknown as SessionMetadata;
  const signalData = await redis.get(`${SESSION_SIGNAL_PREFIX}${id}`);
  const signal: SessionSignal = signalData ? JSON.parse(signalData) : {};

  return { ...metadata, signal };
}

async function createSession(host: string): Promise<Session> {
  const redis = await redisPromise;
  const id = nanoid();
  const createdAt = new Date().toISOString();

  const metadata: SessionMetadata = { id, host, client: "", status: "waiting", createdAt };
  const signal: SessionSignal = {};

  // Store metadata as hash with individual field-value pairs
  await redis.hSet(`${SESSION_METADATA_PREFIX}${id}`, { ...metadata });
  await redis.expire(`${SESSION_METADATA_PREFIX}${id}`, INITIAL_TTL);
  // Store signal as JSON string
  await redis.set(`${SESSION_SIGNAL_PREFIX}${id}`, JSON.stringify(signal));
  await redis.expire(`${SESSION_SIGNAL_PREFIX}${id}`, INITIAL_TTL);

  return { ...metadata, signal };
}

async function joinSession(id: string, client: string): Promise<Session | null> {
  const redis = await redisPromise;

  const session = await getSession(id);
  if (!session || session.status !== "waiting") return null;

  // Update metadata with individual field updates
  await redis.hSet(`${SESSION_METADATA_PREFIX}${id}`, { client, status: "joined" });
  // Reset TTL to 45 seconds
  await redis.expire(`${SESSION_METADATA_PREFIX}${id}`, JOINED_TTL);
  await redis.expire(`${SESSION_SIGNAL_PREFIX}${id}`, JOINED_TTL);

  return { ...session, client, status: "joined" };
}

type AddSignal = (id: string, type: "offer" | "answer", sdp: string, candidate: string[]) => Promise<Session | null>;
const addSignal: AddSignal = async (id, type, sdp, candidate) => {
  const redis = await redisPromise;

  const session = await getSession(id);
  if (!session || session.status !== "joined") return null;

  // Update signal
  const updatedSignal = { ...session.signal };
  updatedSignal[type] = { sdp, candidate };

  // Update status to signaling
  await redis.hSet(`${SESSION_METADATA_PREFIX}${id}`, { status: "signaling" });
  await redis.set(`${SESSION_SIGNAL_PREFIX}${id}`, JSON.stringify(updatedSignal));

  return { ...session, status: "signaling", signal: updatedSignal };
};

type PollSession = (id: string, event: "join" | "offer" | "answer", timeoutMs?: number) => Promise<Session | null>;
const pollSession: PollSession = async (id, event, timeoutMs = 5000) => {
  const startTime = Date.now();
  const checkInterval = 500; // 500ms
  let session = await getSession(id);

  while (Date.now() - startTime < timeoutMs) {
    if (!session) return null;

    if (event === "join" && session.status !== "waiting") return session;
    if (event === "offer" && session.signal.offer) return session;
    if (event === "answer" && session.signal.answer) return session;

    await new Promise((resolve) => setTimeout(resolve, checkInterval));
    session = await getSession(id);
  }

  return session;
};

export { createSession, joinSession, addSignal, pollSession };
