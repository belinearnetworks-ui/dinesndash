// Checking...
console.log("Javascript working")
console.log("order id",OrderId)
// --- INITIALIZATION ---
let cart = JSON.parse(localStorage.getItem("Cart")) || [];
let socket = io();
function getDistanceInMeters(loc1, loc2) {
    const R = 6371; // Earth radius in KM

    const lat1 = loc1.lat * Math.PI / 180;
    const lat2 = loc2.lat * Math.PI / 180;
    const deltaLat = (loc2.lat - loc1.lat) * Math.PI / 180;
    const deltaLng = (loc2.lng - loc1.lng) * Math.PI / 180;

    const a =
        Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
        Math.cos(lat1) * Math.cos(lat2) *
        Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    const distanceKm = R * c;
    return distanceKm * 1000; // meters
}
// Delivery Functionality
delivery_info=delivery_info[0];
if(delivery_info!==undefined){
  console.log(delivery_info.user_geolacation);
  let loc1=JSON.parse(delivery_info.user_geolacation);
  let loc2=JSON.parse(delivery_info.driver_geolocation);
  let distance=getDistanceInMeters(loc1,loc2);
  let estimated_time=distance/22;
  document.getElementById("estimated").innerHTML=estimated_time+"Minutes";
}
// Chat functionality
const sidebar = document.getElementById("chatSidebar");
const overlay = document.getElementById("sidebarOverlay");
const messageContainer = document.getElementById("messageContainer");
const chatInput = document.getElementById("chatInput");
const sendBtn = document.getElementById("sendChat");
console.log("Working before possible error")

console.log("And working after possible error")
// Define 'code' for promocodes if not provided by server
let code = typeof promocode !== "undefined" ? promocode : null;
// --- LOCAL STORAGE FUNCTIONS ---
function saveCartToLocalStorage() {
  localStorage.setItem("Cart", JSON.stringify(cart));
}
function loadCartFromLocalStorage() {
  const savedCart = localStorage.getItem("Cart");
  if (savedCart) {
    cart = JSON.parse(savedCart);
    updateCartUI();
  }
}
document.addEventListener("DOMContentLoaded", () => {
  loadCartFromLocalStorage();
});
// --- CART LOGIC ---
function updateCartQty(meal_id, change) {
  const index = cart.findIndex(
    (c) => String(c.meal_id) === String(meal_id)
  );
  if (index === -1) return;
  cart[index].qty += parseInt(change);
  if (cart[index].qty <= 0) {
    cart.splice(index, 1);
  }
  saveCartToLocalStorage();
  updateCartUI();
}
function updateCartUI() {
  const cartList = document.getElementById("cartItems");
  const badge = document.getElementById("cart-badge"); // Ensure this ID exists in your Nav if you want a badge
  const subtotalEl = document.getElementById("cartSubtotal");
  const totalEl = document.getElementById("cartTotal");
  const totalCount = cart.reduce((acc, item) => acc + item.qty, 0);
  // Update Badge safely
  if (badge) {
    badge.innerText = totalCount;
    badge.style.display = totalCount > 0 ? "flex" : "none";
  }
  if (cart.length === 0) {
    cartList.innerHTML =
      '<div class="empty-cart-msg">Your cart is empty. <br>Start adding some yummy food!</div>';
    subtotalEl.innerText = "R0.00";
    totalEl.innerText = "R0.00";
    return;
  }
  cartList.innerHTML = "";
  let subtotal = 0;
  cart.forEach((item) => {
    subtotal += parseFloat(item.SellingPrice) * item.qty;
    // Use a placeholder if image is missing
    let imgPath =
      item.Images && item.Images.length > 0
        ? item.Images[0]
        : "images/placeholder.jpg";
    const el = document.createElement("div");
    el.className = "cart-item";
    el.innerHTML = `
      <img src="/${imgPath}" alt="Food" onerror="this.src='https://placehold.co/100x100?text=Food'">
      <div class="cart-item-details">
          <div class="cart-item-title">${item.meal_name}</div>
          <div class="cart-item-price">R${parseFloat(
            item.SellingPrice
          ).toFixed(2)}</div>
          <div class="qty-controls">
              <button class="qty-btn" onclick="updateCartQty('${
                item.meal_id
              }', -1)">-</button>
              <span>${item.qty}</span>
              <button class="qty-btn" onclick="updateCartQty('${
                item.meal_id
              }', 1)">+</button>
          </div>
      </div>
  `;
    cartList.appendChild(el);
  });
  subtotalEl.innerText = "R" + subtotal.toFixed(2);
  totalEl.innerText = "R" + subtotal.toFixed(2);
}
// --- UI HELPERS ---
function toggleCart(forceOpen = false) {
  const drawer = document.getElementById("cartDrawer");
  const overlay = document.getElementById("cartOverlay");
  if (forceOpen) {
    drawer.classList.add("open");
    overlay.classList.add("open");
  } else {
    drawer.classList.toggle("open");
    overlay.classList.toggle("open");
  }
}
// --- CHECKOUT LOGIC ---
document.getElementById("checkout-btn").addEventListener("click", () => {
  if (cart.length === 0) return alert("Cart is empty!");
  // Show loading state if element exists
  const loader = document.getElementById("loading");
  if (loader) loader.style.display = "flex";
  const total = cart.reduce(
    (acc, item) => acc + item.SellingPrice * item.qty,
    0
  );
  fetch("/checkout/first", {
    // Use relative path for production compatibility
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      orders: cart,
      Total: total,
      promocode: code,
    }),
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.Status) {
        cart = [];
        saveCartToLocalStorage();
        window.location.href = data.RedirectURL;
      } else {
        if (loader) loader.style.display = "none";
        alert("Checkout failed: " + (data.message || "Unknown error"));
      }
    })
    .catch((err) => {
      if (loader) loader.style.display = "none";
      console.error("Checkout Error:", err);
      alert("Network error. Please try again.");
    });
});
// --- FEEDBACK & STAR RATING ---
// (Keeping your existing logic but wrapping it for safety)
document.addEventListener("click", (e) => {
  // Feedback submission
  if (e.target.classList.contains("submit-feedback")) {
    const btn = e.target;
    const container = btn.closest(".feedback-section");
    const feedback_text = container.querySelector(".feedback-text").value;
    const Type = container.querySelector(".feedback-type").value;
    const meal_id = btn.getAttribute("data-meal-id");
    const OrderId = btn.getAttribute("data-order-id");
    if (!feedback_text || !Type)
      return alert("Please fill in all fields.");
    fetch("/send/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ feedback_text, Type, OrderId, meal_id }),
    })
      .then((res) => res.json())
      .then((data) =>
        data.status ? window.location.reload() : alert(data.message)
      );
  }
});
// Star Rating Logic
document.querySelectorAll(".rate").forEach((star) => {
  star.addEventListener("click", function () {
    const val = this.getAttribute("data-value");
    const meal_id = this.getAttribute("data-mealid");
    const container = this.closest(".rating-stars");
    const OrderId = container.getAttribute("data-order-id");
    container.querySelectorAll(".rate").forEach((s) => {
      s.classList.toggle("active", s.getAttribute("data-value") <= val);
    });
    let confirmBtn = container.querySelector(".tmp-rating-btn");
    if (!confirmBtn) {
      confirmBtn = document.createElement("button");
      confirmBtn.className = "btn btn-primary tmp-rating-btn";
      confirmBtn.style.cssText =
        "padding: 5px; font-size: 0.7rem; margin-top: 10px;";
      container.appendChild(confirmBtn);
    }
    confirmBtn.textContent = `Confirm ${val} Stars`;
    confirmBtn.onclick = () => {
      fetch("/post/to/ratings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ Value: val, meal_id, UserId, OrderId }),
      }).then(() => window.location.reload());
    };
  });
});

// Socket Listener
socket.on("Data Base Updated", (data) => {
  console.log("Data",data)
  if (data.order_id == OrderId) {
    new Audio("/Notification_2.mp3").play().catch(() => {});
    setTimeout(() => window.location.reload(), 2000);
  }
});
// Update send button with orderId
if (sendBtn) {
    sendBtn.setAttribute("data-order-id", OrderId);
}
// SCROLL TO BOTTOM FUNCTION
const scrollToBottom = () => {
    if (messageContainer) {
        messageContainer.scrollTop = messageContainer.scrollHeight;
    }
};

// APPEND MESSAGE FUNCTION
function appendMessage(text, type, timestamp = new Date()) {
    const noChat = document.getElementById("no-chat");
    if (noChat) noChat.remove();
    const messageDiv = document.createElement("div");
    messageDiv.className = `message ${type}`;
    
    const timeString = timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    messageDiv.innerHTML = `
        <div>${text}</div>
        <div class="message-time">${timeString}</div>
    `;
    
    if (messageContainer) {
        messageContainer.appendChild(messageDiv);
        scrollToBottom();
    }
}
// SOCKET: Listen for new chat messages
socket.on("new chat", (data) => {
    console.log("New chat received:", data);
    if (data.orderId == OrderId) {
        // Determine message type based on sender
        const messageType = data.message_by === 'user' ? 'user' : 'driver';
        appendMessage(data.ChatValue || data.chat_value, messageType, new Date());
    }
});
// SIDEBAR CONTROLS
document.getElementById("openChat").addEventListener("click", () => {
    sidebar.classList.add("open");
    overlay.classList.add("active");
    scrollToBottom();
    chatInput.focus();
});
document.getElementById("closeChat").addEventListener("click", closeSidebar);
overlay.addEventListener("click", closeSidebar);
function closeSidebar() {
    sidebar.classList.remove("open");
    overlay.classList.remove("active");
}
// INPUT VALIDATION
chatInput.addEventListener("input", (e) => {
    sendBtn.disabled = e.target.value.trim() === "";
});
// SEND MESSAGE FUNCTION
sendBtn.addEventListener("click", sendMessage);

// Allow Enter key to send (Shift+Enter for new line)
chatInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});
function sendMessage() {
    const chatValue = chatInput.value.trim();
    if (!chatValue || !OrderId) {
        alert("Please enter a message or check if order is selected.");
        return;
    }
    // Show message immediately in UI
    appendMessage(chatValue, 'user');
    
    // POST to server
    fetch("/send/order/chat/by/user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
            orderId: OrderId, 
            chatValue: chatValue 
        })
    })
    .then(res => res.json())
    .then(data => {
        if (data.Status) {
            chatInput.value = "";
            sendBtn.disabled = true;
            // Message already shown in UI via appendMessage
        } else {
            alert("Error: " + (data.reason || "Failed to send message"));
            // Remove the failed message from UI
            const messages = messageContainer.querySelectorAll('.message.user');
            if (messages.length > 0) {
                messages[messages.length - 1].remove();
            }
        }
    })
    .catch(err => {
        console.error("Chat error:", err);
        alert("Network error. Please check your connection.");
    });
}
// Initialize on load
window.addEventListener('load', () => {
    scrollToBottom();
    
    // If there are existing chats, scroll to bottom
    setTimeout(scrollToBottom, 100);
});
// --- Your existing cart and other functionality below ---
// ... keep all your existing cart, checkout, feedback code ...