import { createContext, useContext } from "react";
import { useUploadQueue } from "@/hooks/useUploadQueue";
import { useAuth } from "@/lib/AuthContext";

const UploadContext = createContext(null);
export const useUpload = () => useContext(UploadContext);

export function UploadProvider({ children }) {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  // The queue lives at the provider level (above the router), so it survives
  // page navigation — in-flight uploads keep running and the queue stays
  // intact when the user leaves and returns to the Upload page.
  const queue = useUploadQueue({ user: user || {}, isAdmin });

  return (
    <UploadContext.Provider value={queue}>{children}</UploadContext.Provider>
  );
}