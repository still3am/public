import { useToast } from "@/components/ui/use-toast";
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport } from
"@/components/ui/toast";

export function Toaster() {
  const { toasts } = useToast();

  return (
    <ToastProvider className="hidden">
      {toasts.map(function ({ id, title, description, action, ...props }) {
        return null;











      })}
      <ToastViewport className="hidden" />
    </ToastProvider>);

}