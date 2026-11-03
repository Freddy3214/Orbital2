if("serviceWorker" in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("/sw.js").catch(()=>{}));
let installPrompt;
window.addEventListener("beforeinstallprompt",event=>{
 event.preventDefault();installPrompt=event;
 const button=document.createElement("button");button.type="button";button.className="secondary-button";button.textContent="Als App installieren";button.style.marginTop="12px";
 button.addEventListener("click",async()=>{await installPrompt.prompt();const choice=await installPrompt.userChoice;if(choice.outcome==="accepted")button.remove();});
 document.querySelector(".gate-card")?.append(button);
});
