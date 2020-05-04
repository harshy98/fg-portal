window.self.addEventListener('push',function(e){
   const data = e.data.json();
   window.self.registration.showNotification(data.title,{
       body:'Notification recieved',
   });
});