import { createContext, useContext } from "react";
import type { ToastTone } from "../components/ui/SnappControls";

type Notify = (message: string, tone?: ToastTone) => void;
export const ToastContext = createContext<Notify>(() => {});
/** Announce a local preview outcome through the shell's toast region. */
export const useNotify = () => useContext(ToastContext);
