var publicVapidKey = "BF61J6xLs0jJEsa_tNJCltHo8vDCKLz6l0_HKCem1lGrE3w-4bfxfwBp4SXD6OgJH6fml0IOhumkw5etPjK82sc";

if('serviceWorker' in window.navigator){
    send().catch(err=>console.error(err));
}

async function send(){
    console.log("serviceWorker is registering...");
    const register = await window.navigator.serviceWorker.register('/worker.js',{
        scope: '/'
    });
    console.log("serviceWorker registered");
    const subscription = await register.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicVapidKey)
    });
}
console.log("Push Registered...");

  // Send Push Notification
  console.log("Sending Push...");
  async function getSubscribeAsync(){
     let response= await fetch("/subscribe", {
    method: "POST",
    body: JSON.stringify(subscription),
    headers: {
      "content-type": "application/json"
    }
  });
  console.log("Push Sent...");
}

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, "+")
    .replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}