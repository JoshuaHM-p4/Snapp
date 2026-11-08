import { noirExtension, noirExtensionSigner, type NoirSigner } from "@noirx402/agent-sdk";
import type { StellarWalletsKit } from "@creit.tech/stellar-wallets-kit/sdk";

/** The only network this product signs on. The server builds challenges for it and nothing else. */
export const TESTNET_PASSPHRASE = "Test SDF Network ; September 2015";

export type WalletErrorKind = "cancelled" | "network" | "missing" | "wallet";

/** A wallet-side failure, classified so the dialog can say something useful. */
export class WalletError extends Error {
  constructor(
    public readonly kind: WalletErrorKind,
    message: string,
  ) {
    super(message);
  }
}

/** One connected account that can sign a challenge envelope for it. */
export interface ConnectedWallet {
  address: string;
  sign(xdr: string): Promise<string>;
}

export type WalletMethod = "kit" | "noir";

const CANCEL_WORDS = /clos|cancel|declin|reject|denied|dismiss|abort/i;

function describe(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (e && typeof e === "object" && "message" in e && typeof e.message === "string") return e.message;
  return String(e);
}

function classify(e: unknown): WalletError {
  if (e instanceof WalletError) return e;
  const message = describe(e);
  if (CANCEL_WORDS.test(message)) return new WalletError("cancelled", "You closed the wallet prompt before signing.");
  return new WalletError("wallet", message || "The wallet returned an error.");
}

function assertTestnet(passphrase: string | undefined) {
  if (passphrase && passphrase !== TESTNET_PASSPHRASE)
    throw new WalletError(
      "network",
      "Your wallet is on another Stellar network. Switch it to Testnet and try again.",
    );
}

/** The kit is loaded on first use only; its wallet bridges are heavy and most visitors never sign in. */
let kitReady: Promise<typeof StellarWalletsKit> | null = null;
function loadKit() {
  kitReady ??= Promise.all([
    import("@creit.tech/stellar-wallets-kit/sdk"),
    import("@creit.tech/stellar-wallets-kit/types"),
    import("@creit.tech/stellar-wallets-kit/modules/freighter"),
    import("@creit.tech/stellar-wallets-kit/modules/xbull"),
    import("@creit.tech/stellar-wallets-kit/modules/albedo"),
    import("@creit.tech/stellar-wallets-kit/modules/lobstr"),
  ]).then(([{ StellarWalletsKit }, { Networks }, varial, xbull, albedo, lobstr]) => {
    StellarWalletsKit.init({
      network: Networks.TESTNET,
      modules: [
        new varial.VarialModule(),
        new xbull.xBullModule(),
        new albedo.AlbedoModule(),
        new lobstr.LobstrModule(),
      ],
    });
    return StellarWalletsKit;
  });
  return kitReady;
}

/** Opens the Stellar Wallets Kit picker (Freighter, xBull, Albedo, Lobstr) and returns the chosen account. */
export async function connectKit(): Promise<ConnectedWallet> {
  const kit = await loadKit();
  let address: string;
  try {
    ({ address } = await kit.authModal());
  } catch (e) {
    throw classify(e);
  }
  // Not every wallet exposes its network; when one does, refuse anything but Testnet before asking for a signature.
  try {
    assertTestnet((await kit.getNetwork()).networkPassphrase);
  } catch (e) {
    if (e instanceof WalletError) throw e;
  }
  return {
    address,
    async sign(xdr) {
      try {
        const { signedTxXdr } = await kit.signTransaction(xdr, { networkPassphrase: TESTNET_PASSPHRASE, address });
        return signedTxXdr;
      } catch (e) {
        throw classify(e);
      }
    },
  };
}

/** True when the Noir browser extension injected `window.noir.stellar`. */
export const hasNoirExtension = () => noirExtension() !== null;

/** Connects to the Noir extension (the user approves the site once) and returns its account. */
export async function connectNoir(): Promise<ConnectedWallet> {
  if (!hasNoirExtension()) throw new WalletError("missing", "The Noir extension is not installed in this browser.");
  let signer: NoirSigner;
  try {
    signer = await noirExtensionSigner();
  } catch (e) {
    throw classify(e);
  }
  return {
    address: signer.publicKey,
    async sign(xdr) {
      try {
        const out = await signer.signTransaction(xdr, { networkPassphrase: TESTNET_PASSPHRASE });
        return typeof out === "string" ? out : out.signedTxXdr;
      } catch (e) {
        throw classify(e);
      }
    },
  };
}

export const connect = (method: WalletMethod) => (method === "kit" ? connectKit() : connectNoir());

/** Forget the kit's remembered wallet so the next Connect shows the picker again. No-op when the kit never loaded. */
export async function disconnectKit() {
  if (!kitReady) return;
  await (await kitReady).disconnect();
}
