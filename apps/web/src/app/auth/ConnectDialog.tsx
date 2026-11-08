import { useEffect, useState } from "react";
import { Button, Dialog, Heading, Modal, ModalOverlay } from "react-aria-components";
import { Puzzle, TriangleAlert, Wallet, X } from "lucide-react";
import { SnappLoading } from "../../components/ui/SnappLoading";
import { signInErrorMessage, useSession } from "./session";
import { hasNoirExtension, type WalletMethod } from "./wallets";
import "./auth.css";

type Step = { kind: "pick" } | { kind: "busy"; method: WalletMethod } | { kind: "error"; message: string };

/**
 * Pick a wallet, sign the server's challenge, done. While the Stellar Wallets Kit shows its own
 * picker the dialog hides, so two modals never fight over focus; it comes back for the signing wait
 * and for any error.
 */
export function ConnectDialog({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  // Theme tokens are inline variables on .snapp-root. react-aria portals to <body> by default, which sits
  // outside that scope and leaves the dialog unstyled; portal into the themed root instead.
  const [portal, setPortal] = useState<Element | undefined>(undefined);
  useEffect(() => {
    setPortal(document.querySelector(".snapp-root") ?? undefined);
  }, []);
  const { signIn } = useSession();
  const [step, setStep] = useState<Step>({ kind: "pick" });
  const [hidden, setHidden] = useState(false);
  const noir = hasNoirExtension();

  const close = () => {
    if (step.kind === "busy") return;
    setStep({ kind: "pick" });
    onClose();
  };

  const run = async (method: WalletMethod) => {
    setStep({ kind: "busy", method });
    // The kit renders its own picker; step aside until an account is chosen.
    if (method === "kit") setHidden(true);
    try {
      await signIn(method, () => setHidden(false));
      setStep({ kind: "pick" });
      onClose();
    } catch (e) {
      setStep({ kind: "error", message: signInErrorMessage(e) });
    } finally {
      setHidden(false);
    }
  };

  return (
    <ModalOverlay
      className="s-modal-overlay"
      UNSTABLE_portalContainer={portal}
      isOpen={isOpen && !hidden}
      onOpenChange={(open) => !open && close()}
      isDismissable={step.kind !== "busy"}
      isKeyboardDismissDisabled={step.kind === "busy"}
    >
      <Modal className="s-modal">
        <Dialog className="s-connect">
          {({ close: closeDialog }) => (
            <>
              <header className="s-connect-head">
                <Heading slot="title">Connect a wallet</Heading>
                <Button
                  className="s-btn s-btn--quiet s-icon-btn"
                  aria-label="Close"
                  isDisabled={step.kind === "busy"}
                  onPress={closeDialog}
                >
                  <X size={20} aria-hidden="true" />
                </Button>
              </header>
              <p className="s-muted s-connect-lede">
                Sign one Stellar Testnet challenge to prove you hold the address. No transaction is
                submitted and nothing leaves your wallet but the signature.
              </p>

              {step.kind === "busy" ? (
                <div className="s-api-state">
                  <SnappLoading
                    label={
                      step.method === "kit"
                        ? "Waiting for your wallet to sign the challenge"
                        : "Waiting for the Noir extension to sign the challenge"
                    }
                  />
                  <p className="s-note">Approve the request in the wallet prompt. It signs on Testnet only.</p>
                </div>
              ) : (
                <>
                  {step.kind === "error" && (
                    <div className="s-notice s-notice--stop" role="alert">
                      <TriangleAlert size={16} aria-hidden="true" />
                      <div>{step.message}</div>
                    </div>
                  )}
                  <div className="s-connect-options">
                    <Button className="s-connect-option" onPress={() => void run("kit")}>
                      <Wallet size={20} aria-hidden="true" />
                      <span>
                        <strong>Stellar wallet</strong>
                        <small>Freighter (listed as Varial), xBull, Albedo, Lobstr and others</small>
                      </span>
                    </Button>
                    <Button className="s-connect-option" isDisabled={!noir} onPress={() => void run("noir")}>
                      <Puzzle size={20} aria-hidden="true" />
                      <span>
                        <strong>Noir extension</strong>
                        <small>
                          {noir
                            ? "Sign with the account in your Noir browser extension"
                            : "Not detected in this browser. Install the Noir extension and reload."}
                        </small>
                      </span>
                    </Button>
                  </div>
                </>
              )}
              <p className="s-note">
                Owners and recipients of a recorded run get their own view. Anyone else can browse the
                demo.
              </p>
            </>
          )}
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}
