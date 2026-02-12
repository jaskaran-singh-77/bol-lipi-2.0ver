import { FormData } from "../types";

const PBKDF2_ITERATIONS = 120000;

function base64FromBytes(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function bytesFromBase64(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const baseKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(passphrase),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export interface EncryptedPayload {
  version: 1;
  cipherText: string;
  iv: string;
  salt: string;
}

export async function encryptFormData(passphrase: string, data: FormData): Promise<EncryptedPayload> {
  const enc = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await deriveKey(passphrase, salt);
  const plainBytes = enc.encode(JSON.stringify(data));
  const cipherBuffer = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plainBytes);
  return {
    version: 1,
    cipherText: base64FromBytes(new Uint8Array(cipherBuffer)),
    iv: base64FromBytes(iv),
    salt: base64FromBytes(salt),
  };
}

export async function decryptFormData(passphrase: string, payload: EncryptedPayload): Promise<FormData> {
  const dec = new TextDecoder();
  const iv = bytesFromBase64(payload.iv);
  const salt = bytesFromBase64(payload.salt);
  const key = await deriveKey(passphrase, salt);
  const cipherBytes = bytesFromBase64(payload.cipherText);
  const plainBuffer = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, cipherBytes);
  return JSON.parse(dec.decode(plainBuffer)) as FormData;
}
