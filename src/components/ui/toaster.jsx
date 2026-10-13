import { useToast } from "@/components/ui/use-toast";
import { Toast, ToastClose, ToastDescription, ToastProvider, ToastTitle, ToastViewport } from "@/components/ui/toast";

export function Toaster() {
  const { toasts } = useToast();
  return (
    <ToastProvider>
      {toasts.filter(item=>item.variant!=="destructive").map(({ id, title, description, action, ...props }) => (
        <Toast key={id} {...props}>
          <div className="grid gap-1">
            {title && <ToastTitle>{title}</ToastTitle>}
            {description && <ToastDescription>{description}</ToastDescription>}
          </div>
          {action}
          <ToastClose aria-label="Dismiss notification" />
        </Toast>
      ))}
      <ToastViewport className="z-[100] pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-4" />
    </ToastProvider>
  );
}
