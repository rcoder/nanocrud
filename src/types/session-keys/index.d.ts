declare module 'session-keys' {
  export type KeyInfo = {
    publicKey: Buffer;
    secretKey: Buffer;
  }
  
  export type GeneratedKeys = {
    id: string,
    byteKeys: Buffer[],
    hexKeys: string[],
    naclEncryptionKeyPairs: KeyInfo[];
    naclEncryptionKeyPairsBase64: string[];
    naclSigningKeyPairs: KeyInfo[];
    naclSigningKeyPairsBase64: string[];
  }

  export type GenerateCallback = (err: Error, keys: GeneratedKeys) => void;

  export function generate(ident: string, passphrase: string, callback: GenerateCallback): void;
}