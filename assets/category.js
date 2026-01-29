    
// --- INITIAL STATE ---
let foodData = [];
let cart = JSON.parse(localStorage.getItem("Cart")) || [];
let code;
let date;
let currentFilter = "all";
// --- LOCAL STORAGE FUNCTIONS ---
function saveCartToLocalStorage() {
  localStorage.setItem("Cart", JSON.stringify(cart));
}
function loadCartFromLocalStorage() {
  const savedCart = localStorage.getItem("Cart");
  if (savedCart) {
    cart = JSON.parse(savedCart);
    console.log("Loaded cart from localStorage:", cart);
    updateCartUI();
  }
}
// --- LOAD DATA ---
document.addEventListener("DOMContentLoaded", () => {
  // Load cart from local storage
  loadCartFromLocalStorage();
  // Initialize Variables
  if (Promo) {
    code = Promo.promocode;
    date = new Date(Promo.expiry);
  }
  // Ensure foodData is an array
  let rawData=Data;
  let tempFoodData = Array.isArray(rawData) ? rawData : [rawData];
  // Process Image JSON strings ONCE here so we don't have to do it repeatedly
  foodData = tempFoodData.map((item) => {
    let parsedImages = [];
    try {
      // Check if Images is a string, then parse, otherwise use as is
      parsedImages =
        typeof item.Images === "string"
          ? JSON.parse(item.Images)
          : item.Images;
    } catch (e) {
      console.error("Error parsing images for meal " + item.meal_id, e);
      parsedImages = ["images/default_food.jpg"]; // Fallback
    }
    return { ...item, Images: parsedImages };
  });
  // Initial Render
 
  renderFood(
    "all",
    "",
    Data,
    "Meals Special For you",
    "trending-food-grid",
    "foodGrid",
    "div_foodGrid"
  );
  
  document.querySelectorAll(".Fav-Btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      let MealId = btn.getAttribute("MealId");
      let status = btn.getAttribute("status");
      console.log("Status", status);
      if (status == "false") {
        fetch("/add/to/fav", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ MealId }),
        })
          .then((res) => res.json())
          .then((data) => {
            if (!data.status) {
              alert(data.reason);
            } else if (data.status) {
              btn.innerHTML = "❤️";
              btn.setAttribute("status", "true");
            }
          })
          .catch((error) => {
            if (error) {
              window.location.reload();
            }
          });
      } else if (status == "true") {
        fetch("/delete/to/fav", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ MealId }),
        })
          .then((res) => res.json())
          .then((data) => {
            if (!data.status) {
              alert(data.reason);
            } else if (data.status) {
              btn.innerHTML = '<i class="fa-regular fa-heart"></i>';
              btn.setAttribute("status", "false");
            }
          })
          .catch((error) => {
            if (error) {
              window.location.reload();
            }
          });
      }
    });
  });
});
// --- ICONS (Helper) ---
const ICONS = {
  clock:
    '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" style="vertical-align:middle"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  store:
    '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" style="vertical-align:middle"><path d="M3 9l1-3h16l1 3"/><path d="M21 9v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9"/></svg>',
};
// --- Render food Grid---
function renderFood(
  filter = "all",
  searchTerm = "",
  Data,
  title,
  Class,
  id,
  div_id
) {
  console.log(filter);
  console.log(Data)
  const grid = document.getElementById(`${id}`);
  grid.ClassName = Class;
  let HeaderTitle = document.createElement("h2");
  HeaderTitle.className = "section-title";
  HeaderTitle.textContent = title;
  document.getElementById(`${div_id}`).appendChild(HeaderTitle);
  document
    .getElementById(`${div_id}`)
    .appendChild(document.createElement("br"));
  // Filter Logic
  const filtered = Data.filter((item) => {
    // 1. Search Filter
    const matchesSearch =
      item.meal_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.storename.toLowerCase().includes(searchTerm.toLowerCase());
    // 2. Category Filter (Mock logic based on keywords in name since tags aren't in provided JSON schema)
    let matchesCategory = true;
    if (filter === "healthy") {
      // Simple mock check
      matchesCategory = item.meal_name
        .toLowerCase()
        .match(/salad|vegan|fruit|healthy/);
    } else if (filter === "fast") {
      matchesCategory = item.TimeTo <= 20;
    } else if (filter === "trending") {
      // Random mock for visual demo
      matchesCategory = true;
    }
    return matchesSearch && matchesCategory;
  });
  if (filtered.length === 0) {
    grid.innerHTML =
      '<div style="grid-column: 1/-1; text-align:center; color:var(--gray); margin-top:50px;">No food found matching your criteria.</div>';
    return;
  }
  Data.forEach((item) => {
    let element;
    if (!item.fav) {
      element = `<button style="background-color:inherit;border:none;" MealId="${item.meal_id}" status='false' class="Fav-Btn"><i class="fa-regular fa-heart"></i></button>`;
    } else if (item.fav) {
      element = `<button style="background-color:inherit;border:none;" MealId="${item.meal_id}" status='true' class="Fav-Btn">❤️</button>`;
    }
    let allergy_element = "";
    if (item.allergy_index > 0) {
      allergy_element = ` <span style="color:red;font-size:12px;">⚠️ Contains allergens</span>`;
    }
    // Check if item is already in cart
    const inCart = cart.find(
      (c) => String(c.meal_id) === String(item.meal_id)
    );
    const cartButtonText = inCart
      ? `In Cart (${inCart.qty})`
      : "Add to Cart";
    const cartButtonClass = inCart ? "in-cart-btn" : "add-btn";
    // Access pre-parsed images
    let FirstImage =
      item.Images && item.Images.length > 0
        ? item.Images[0]
        : "images/placeholder.jpg";
    const card = document.createElement("div");
    card.className = "food-card";
    card.innerHTML = `
      <div class="card-image">
          <img src="/${FirstImage}" alt="${
      item.meal_name
    }" onerror="this.src='https://placehold.co/600x400?text=No+Image'">
          <div class="time-badge">${ICONS.clock} ${item.TimeTo} Min</div>
          <div class="fav">${element}</div>
      </div>
      <div class="card-content">
          <div class="card-header">
              <div>
                  <div class="item-name">${
                    item.meal_name
                  } ${allergy_element}</div>
                  <div class="restaurant-name" ><a href="/store/${
                    item.store_id
                  }">${ICONS.store} ${item.storename}</a></div>
                  <div class="closes"><small><i>closes in: 20 min</i></small></div> 
              </div>
              <div class="item-price">R${item.SellingPrice}</div>
          </div>
          <button class="${cartButtonClass}" onclick="addToCart('${
      item.meal_id
    }')" ${inCart ? "disabled" : ""}>
              ${cartButtonText}
          </button>
          <br>
          <a href="/meal/details/${
            item.meal_id
          }" style="font-size:8px;" class="details-link">View full meal Details</a>
      </div>
  `;
    grid.appendChild(card);
  });
}
// --- CART LOGIC ---
function addToCart(meal_id) {
  // Find item in master data
  const item = foodData.find(
    (f) => String(f.meal_id) === String(meal_id)
  );
  if (!item) return console.error("Item not found");
  // Check if already in cart
  const existing = cart.find(
    (c) => String(c.meal_id) === String(meal_id)
  );
  if (existing) {
    existing.qty++;
  } else {
    cart.push({
      meal_id: item.meal_id,
      meal_name: item.meal_name,
      SellingPrice: item.SellingPrice,
      Images: item.Images,
      storename: item.storename,
      id: item.store_id,
      qty: 1,
    });
  }
  saveCartToLocalStorage();
  updateCartUI();
  toggleCart(true); // Open cart to show user
  // Re-render food grid to update button states
  renderFood(currentFilter, document.getElementById("searchInput").value);
}
function updateCartQty(meal_id, change) {
  const val = parseInt(change);
  const index = cart.findIndex(
    (c) => String(c.meal_id) === String(meal_id)
  );
  if (index === -1) return;
  cart[index].qty += val;
  if (cart[index].qty <= 0) {
    cart.splice(index, 1);
  }
  saveCartToLocalStorage();
  updateCartUI();
  // Re-render food grid to update button states
  renderFood(currentFilter, document.getElementById("searchInput").value);
}
function updateCartUI() {
  const cartList = document.getElementById("cartItems");
  const badge = document.getElementById("cart-badge");
  const subtotalEl = document.getElementById("cartSubtotal");
  const totalEl = document.getElementById("cartTotal");
  // Update Badge
  const totalCount = cart.reduce((acc, item) => acc + item.qty, 0);
  badge.innerText = totalCount;
  badge.style.transform = "scale(1.2)";
  setTimeout(() => (badge.style.transform = "scale(1)"), 200);
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
    // Handle image for cart
    let imgPath =
      item.Images && item.Images.length > 0 ? item.Images[0] : "";
    const el = document.createElement("div");
    el.className = "cart-item";
    el.innerHTML = `
      <img src="/${imgPath}" alt="Food" onerror="this.src='https://placehold.co/100x100?text=Food'">
      <div class="cart-item-details">
          <div class="cart-item-title">${item.meal_name}</div>
          <div class="cart-item-price">R${item.SellingPrice}</div>
          <div class="qty-controls">
              <button class="qty-btn" onclick="updateCartQty('${item.meal_id}', -1)">-</button>
              <span>${item.qty}</span>
              <button class="qty-btn" onclick="updateCartQty('${item.meal_id}', 1)">+</button>
          </div>
      </div>

  `;
    cartList.appendChild(el);
  });
  const total = subtotal;
  subtotalEl.innerText = "R" + subtotal.toFixed(2);
  totalEl.innerText = "R" + total.toFixed(2);
}
// --- CART DRAWER ---
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
// --- FILTER & SEARCH ---
function setFilter(type, btn) {
  currentFilter = type;
  document
    .querySelectorAll(".category-chip")
    .forEach((c) => c.classList.remove("active"));
  btn.classList.add("active");
  filterFood();
}
function filterFood() {
  const searchVal = document.getElementById("searchInput").value;
  renderFood(currentFilter, searchVal);
}
// --- SIDEBAR MOBILE ---
function toggleSidebar() {
  document.getElementById("sidebar").classList.toggle("open");
}
// --- CHECKOUT LOGIC ---
document.getElementById("checkout-btn").addEventListener("click", () => {
  if (cart.length === 0) return alert("Cart is empty!");
  document.getElementById("loading").style.display = "flex";
  let total = 0;
  cart.forEach((item) => {
    total += item.SellingPrice * item.qty;
  });
  console.log("Cart", cart);
  // Send cart data to server for checkout
  fetch("http://localhost:4000/checkout/first", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      orders: cart,
      Total: total,
      promocode: code,
    }),
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.Status) {
        // Clear cart after successful checkout
        cart = [];
        saveCartToLocalStorage();
        updateCartUI();
        // window.open(`${data.RedirectURL}`);
        document.getElementById("loading").style.display = "none";
        window.location.href = `${data.RedirectURL}`;
        // window.open(`${data.RedirectURL}`);
      } else {
        document.getElementById("loading").style.display = "none";
        alert("Checkout failed: " + (data.message || "Unknown error"));
      }
    })
    .catch((err) => {
      document.getElementById("loading").style.display = "none";
      console.error(err);
      // alert("Network error. Please try again.");
    });
});
// --- CLEAR CART FUNCTION (Optional) ---
function clearCart() {
  if (confirm("Are you sure you want to clear your cart?")) {
    cart = [];
    saveCartToLocalStorage();
    updateCartUI();
    renderFood(
      currentFilter,
      document.getElementById("searchInput").value
    );
  }
}