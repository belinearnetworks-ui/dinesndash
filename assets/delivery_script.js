console.log("Delivery Script Loaded");
  const sidebar = document.getElementById("chatSidebar");
  const overlay = document.getElementById("sidebarOverlay");
  const messageContainer = document.getElementById("messageContainer");
  const chatInput = document.getElementById("chatInput");
  const sendBtn = document.getElementById("sendChat");

  let delivery_address=JSON.parse(delivery[0].delivery_address)
  console.log(delivery_address);

  document.getElementById("ext").innerHTML=delivery_address.Ext;
  document.getElementById("stand").innerHTML=delivery_address.Stand;
  document.getElementById("town").innerHTML=delivery_address.Town;
  document.getElementById("extra").innerHTML=delivery_address.extra_info


  
  // This ensures it's always a string and won't break if empty
  
  const socket = io();

  // SCROLL TO BOTTOM FUNCTION
  const scrollToBottom = () => {
    messageContainer.scrollTop = messageContainer.scrollHeight;
  };
  window.onload = scrollToBottom;

  // APPEND MESSAGE MANUALLY (UI ONLY)
  function appendMessage(text, type) {
    const noChat = document.getElementById("no-chat");
    if (noChat) noChat.remove();

    const p = document.createElement("p");
    p.classList.add(type);
    p.textContent = text;
    messageContainer.appendChild(p);
    scrollToBottom();
  }

  // SOCKET: Listen for new messages
  socket.on("new chat for driver", data => {

    if (data.orderId == orderId) {
      new Audio("/Notification_2.mp3").play().catch(() => {});
      // If the message wasn't sent by me (you'll need to check data.sender)
      // Otherwise, just append it if you aren't doing the manual append on click


      appendMessage(data.chatValue, data.message_by === 'driver' ? 'me' : 'them');
    }
  });

  // Socket Listener
   socket.on("Data Base Updated", (data) => {
    console.log("Data",data);
    
     if (data.order_id == orderId) {
       if(data.status=="COLLECTED_BY_DRIVER"){
        alert("You have collected the order, Now deliver it")
       }
      
       new Audio("/Notification_2.mp3").play().catch(() => {});
       setTimeout(() => window.location.reload(), 2000);
       let current={};
       navigator.geolocation.getCurrentPosition(position=>{
        current.lat=position.coords.latitude
        current.lng=position.coords.longitude
       })
       fetch("/updated/driver/location"+orderId,{
        method:"POST",
        headers:{"content-type":"application/json"},
        body:JSON.stringify(current)
       }).then(res=>res.json());
     }
   });
  // SIDEBAR CONTROLS
  document.getElementById("openChat").addEventListener("click", () => {
    sidebar.classList.add("open");
    overlay.classList.add("active");
    scrollToBottom();
  });

 const arrivedBtn = document.getElementById("arrived");
 let collectedBtn = document.getElementById("collected");

if (collectedBtn) {
    collectedBtn.addEventListener("click", () => {
        console.log("Collected button clicked for order:", orderId);
        
        let el = `
        <form id="deliveryForm">
            <h2>Delivery Confirmation</h2>
            <label for="confirmationCode">Confirmation Code:</label>
            <small>Enter the 5 digits code from the user to confirm the order:</small>
            <input type="number" id="confirmationCode" name="confirmationCode" placeholder="Enter 5-digit code" required />
            <button type="submit" id="SubmitDelivery">Submit</button>
        </form>`;

        let deliveryDiv = document.getElementById("overlay");
        deliveryDiv.style.display = "block";
        deliveryDiv.innerHTML = el;

        // --- FIX STARTS HERE ---
        // Now that the form exists in the DOM, we grab it and add the listener
        const form = document.getElementById("deliveryForm");
        
        form.addEventListener("submit", async (e) => {
            e.preventDefault(); // Prevents the page from refreshing
            
            console.log("Submit Delivery clicked for order:", orderId);
            let codeInput = document.getElementById("confirmationCode").value.trim();

            try {
                let response = await fetch(`/order/delivered/${orderId}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ 
                        status: "COLLECTED_BY_USER", 
                        confirmationCode: codeInput 
                    })
                });

                let data = await response.json();

                if (data.Status) {
                    alert("Order delivery confirmed successfully.");
                    window.location.reload();
                } else {
                    console.log(data)
                    alert("Error: " + data.reason);
                }
            } catch (err) {
                alert("Failed to update order status.");
                console.error(err);
            }
        });
    });
}

if (arrivedBtn) {
  arrivedBtn.addEventListener("click", async () => {
    console.log("Arrived button clicked for order:", orderId);
    try {
      const res = await fetch(`/driver/arrived/${orderId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ status: "ARRIVED" })
      });

      if (!res.ok) {
        throw new Error(`HTTP error! Status: ${res.status}`);
      }

      const data = await res.json();

      if (data.Status) {
        alert("Status updated to Arrived");
        window.location.reload();
      } else {
        alert("Error: " + data.reason);
      }

    } catch (err) {
      console.error(err);
      alert("Failed to update order status.");
    }
  });
}


  document.getElementById("closeChat").addEventListener("click", closeSidebar);
  overlay.addEventListener("click", closeSidebar);

  function closeSidebar() {
    sidebar.classList.remove("open");
    overlay.classList.remove("active");
  }

  // INPUT LOGIC
  chatInput.addEventListener("input", (e) => {
    sendBtn.disabled = e.target.value.trim() === "";
  });

  // SEND MESSAGE
  sendBtn.addEventListener("click", () => {
    const chatValue = chatInput.value.trim();
    if (!chatValue) return;
    

    // POST to server
    fetch("/send/order/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId, chatValue })
    })
    .then(res => res.json())
    .then(data => {
      if (data.Status) {
        chatInput.value = ""; // Clear input
        sendBtn.disabled = true;
        appendMessage(chatValue,"me")
        // document.getElementById("chatSidebar").style.display="block";

        // The message will appear via Socket.io automatically if you have it set up 
        // to broadcast to the sender too. If not, call appendMessage(chatValue, 'me') here.
      } else {
        alert("Error: " + data.reason);
      }
    })
    .catch(err => console.error("Chat error:", err));
  });