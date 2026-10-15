export function actionError(error,fallback="That action couldn’t finish. Please try again."){
 const status=error?.status??error?.response?.status;
 if(status===401)return "Your session expired. Sign in and try again.";
 if(status===402)return "This service is temporarily unavailable. Please try again later.";
 if(status===403)return "You don’t have permission to do that.";
 if(status===429)return "Too many requests. Wait a moment and try again.";
 const message=error?.response?.data?.error;
 if((status===409||status===422)&&typeof message==="string"&&message.length<240)return message;
 return fallback;
}
export function reportActionError(error,fallback){
 window.dispatchEvent(new CustomEvent("public:error",{detail:{message:actionError(error,fallback)}}));
}
