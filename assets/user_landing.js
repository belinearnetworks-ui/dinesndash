// --- INITIAL STATE ---
let foodData = [];
let cart = JSON.parse(localStorage.getItem("Cart")) || [];
let code;
let date;
let currentFilter = 'all';

let currentCartStoreFilter = 'all'; 

// --- LOCAL STORAGE FUNCTIONS ---
function saveCartToLocalStorage() {
    localStorage.setItem("Cart", JSON.stringify(cart));
}

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

function getLocationAsync() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error("Geolocation not supported"));
        }

        navigator.geolocation.getCurrentPosition(
            position => {
                const latitude = position.coords.latitude;
                const longitude = position.coords.longitude;

                const locationData = {
                    lat: latitude,
                    lng: longitude,
                    expiry: new Date().toISOString()
                };

                // Save to localStorage
                localStorage.setItem("Cookies", JSON.stringify([locationData]));

                resolve(locationData);
            },
            error => reject(error)
        );
    });
}

async function init() {
    try {
        const location = await getLocationAsync();
        console.log("Location:", location);
    } catch (err) {
        console.error("Location error:", err.message);
    }
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
    if(Promo) {
        code = Promo.promocode;
        date = new Date(Promo.expiry);
    }
    
    // Ensure foodData is an array
    let tempFoodData = Array.isArray(rawData) ? rawData : [rawData];
    
    // Process Image JSON strings ONCE here so we don't have to do it repeatedly
    foodData = tempFoodData.map(item => {
        let parsedImages = [];
        try {
            // Check if Images is a string, then parse, otherwise use as is
            parsedImages = typeof item.Images === 'string' ? JSON.parse(item.Images) : item.Images;
        } catch (e) {
            console.error("Error parsing images for meal " + item.meal_id, e);
            parsedImages = ['images/default_food.jpg']; // Fallback
        }
        return { ...item, Images: parsedImages };
    });

    // Initial Render
    let Trending=Data[0];
    let Deals=Data[1];
    let QuickBites=Data[2];
    let Recommended=Data[3];
    renderFood("all","",Trending.data,Trending.title,"trending-food-grid","foodGrid","div_foodGrid");
    renderFood("all","",Deals.data,Deals.title,"deals-food-grid","best-deals","div_best-deals");
    renderFood("all","",QuickBites.data,QuickBites.title,"quick-bites-food-grid","fast-grid","div_fast-grid");
    renderStores(stores,"storeGrid");
    renderCategories(Categories,"cat-grid");
    renderFood("all","",Recommended.data,Recommended.title,"recommended-food-grid","recommended-grid","div_recommended-grid");

    document.querySelectorAll(".Fav-Btn").forEach(btn=>{
        btn.addEventListener("click",()=>{
            let MealId=btn.getAttribute("MealId");
            let status=btn.getAttribute("status");
            console.log("Status",status)
            if(status=="false"){
                fetch("/add/to/fav",{
                    method:"POST",
                    headers:{"content-type":"application/json"},
                    body:JSON.stringify({MealId})
                }).then(res=>res.json()).then(data=>{
                    if(!data.status){
                        alert(data.reason)
                    }else if(data.status){
                        btn.innerHTML="❤️"
                        btn.setAttribute("status","true")
                    }
                }).catch(error=>{
                    if(error){
                        window.location.reload();
                    }
                })
            }else if(status=="true"){
                fetch("/delete/to/fav",{
                    method:"POST",
                    headers:{"content-type":"application/json"},
                    body:JSON.stringify({MealId})
                }).then(res=>res.json()).then(data=>{
                    if(!data.status){
                        alert(data.reason)
                    }else if(data.status){
                        btn.innerHTML='<i class="fa-regular fa-heart"></i>';
                        btn.setAttribute("status","false");
                    }
                }).catch(error=>{
                    if(error){
                        window.location.reload();
                    }
                })
            }
        })
    })
});

document.getElementById("search-input").addEventListener("input",(e)=>{
    
    let Value=e.target.value
    return window.location.href=`/search/${Value}`
})

// --- ICONS (Helper) ---
const ICONS = {
    clock: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" style="vertical-align:middle"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    store: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" style="vertical-align:middle"><path d="M3 9l1-3h16l1 3"/><path d="M21 9v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9"/></svg>'
};
// --- Render Store Grid---
function renderStores(Data,id){
    console.log("Stores Data:",Data);
    let TitleHeader=document.createElement("h2");
    TitleHeader.className="section-title";
    TitleHeader.textContent="Shop By stores";
    const grid=document.getElementById(id);
    grid.appendChild(TitleHeader);
    grid.appendChild(document.createElement("br"));
    Data.forEach(item=>{
        console.log("Store Item:",item);
        let element=document.createElement("div");
        element.className="store-card";
        element.innerHTML=`
        <div class="store-image"><a href="/store/${item.id}"><img src="/${item.store_logo}" alt="${item.storename}" /></a></div>
        <div class="store-name"><a href="/store/${item.id}">${item.storename}</a></div>
        `
        grid.appendChild(element);
    });
}
// --- Render Category Grid---
function renderCategories(Data,id){
    console.log("Categories Data:",Data);
    let imgSrc="";
    console.log("Category Image Source:",imgSrc);
    let TitleHeader=document.createElement("h2");
    TitleHeader.className="section-title";
    TitleHeader.textContent="Shop By Category";
    const grid=document.getElementById(id);
    grid.appendChild(TitleHeader);
    grid.appendChild(document.createElement("br"));
    Data.forEach(item=>{

        if(item.used_stock_image=="YES"){
            imgSrc=`${item.category_pic}`;
        }else if(item.used_stock_image=="NO"){
            imgSrc=`/${item.category_pic}`;
        }
        console.log("Store Item:",item);
        console.log(item.Cat_id);
        let element=document.createElement("div");
        element.className="store-card";
        element.innerHTML=`
        <div class="store-image"><a href="/category/user/${item.Cat_id}"><img src="${imgSrc}" alt="${item.catagory_name}" /></a></div>
        <div class="store-name"><a href="/category/user/${item.Cat_id}">${item.catagory_name}</a></div>
        `
        grid.appendChild(element);
    });
}

// --- RENDER FOOD GRID ---
function renderFood(filter = 'all', searchTerm = '',Data,title,Class,id,div_id) {
    const grid = document.getElementById(`${id}`);
    grid.ClassName=Class;
    let HeaderTitle=document.createElement("h2");
    HeaderTitle.className="section-title";
    HeaderTitle.textContent=title;
    document.getElementById(`${div_id}`).appendChild(HeaderTitle)
    document.getElementById(`${div_id}`).appendChild(document.createElement("br"));


    
    // Filter Logic
    const filtered = Data.filter(item => {
        // 1. Search Filter
        const matchesSearch = item.meal_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              item.storename.toLowerCase().includes(searchTerm.toLowerCase());
        
        // 2. Category Filter (Mock logic based on keywords in name since tags aren't in provided JSON schema)
        let matchesCategory = true;
        if (filter === 'healthy') {
           // Simple mock check
           matchesCategory = item.meal_name.toLowerCase().match(/salad|vegan|fruit|healthy/);
        } else if (filter === 'fast') {
           matchesCategory = item.TimeTo <= 20; 
        } else if (filter === 'trending') {
           // Random mock for visual demo
           matchesCategory = true; 
        }
        return matchesSearch && matchesCategory;
    });
    
    if(filtered.length === 0) {
       grid.innerHTML = '<div style="grid-column: 1/-1; text-align:center; color:var(--gray); margin-top:50px;">No food found matching your criteria.</div>';
       return;
    }
    
    filtered.forEach(item => {
        let element;
        let closes;

        if(!item.fav){
            element=`<button style="background-color:inherit;border:none;" MealId="${item.meal_id}" status='false' class="Fav-Btn"><i class="fa-regular fa-heart"></i></button>`
        }else if(item.fav){
            element=`<button style="background-color:inherit;border:none;" MealId="${item.meal_id}" status='true' class="Fav-Btn">❤️</button>`
        }
        
        let allergy_element="";
        if(item.allergy_index>0){
            allergy_element=` <span style="color:red;font-size:12px;">⚠️ Contains allergens</span>`
        }
        
        if(item.Trading=="open"){
                    
            closes=`<div class="closes" style='color:green;'><small><i>closes at: ${item.closing}</i></small></div> `
        }else{
            closes=`<div class="closes"><small><i>Store Closed!</i></small></div> `
        }

        // Check if item is already in cart
        const inCart = cart.find(c => String(c.meal_id) === String(item.meal_id));
        const cartButtonText = inCart ? `In Cart (${inCart.qty})` : 'Add to Cart';
        const cartButtonClass = inCart ? 'in-cart-btn' : 'add-btn';
        
        // Access pre-parsed images
        let FirstImage = (item.Images && item.Images.length > 0) ? JSON.parse(item.Images)[0] : 'images/placeholder.jpg';
        console.log("images")
        
        const card = document.createElement('div');
        card.className = 'food-card';
        
        card.innerHTML = `
            <div class="card-image">
                <img src="/${FirstImage}" alt="${item.meal_name}" onerror="this.src='https://placehold.co/600x400?text=No+Image'">
                <div class="time-badge">${ICONS.clock} ${item.TimeTo} Min</div>
                <div class="fav">${element}</div>
            </div>
            <div class="card-content">
                <div class="card-header">
                    <div>
                        <div class="item-name">${item.meal_name} ${allergy_element}</div>
                        <div class="restaurant-name" ><a href="/store/${item.store_id}">${ICONS.store} ${item.storename}</a></div>
                        ${closes}
                    </div>
                    <div class="item-price">R${item.SellingPrice}</div>
                </div>
                <button class="${cartButtonClass}" onclick="addToCart('${item.meal_id}')" ${inCart ? 'disabled' : ''}>
                    ${cartButtonText}
                </button>
                <br>
                <a href="/meal/details/${item.meal_id}" style="font-size:8px;" class="details-link">View full meal Details</a>
            </div>
        `;
        grid.appendChild(card);
    });
}

// --- CART LOGIC ---
function addToCart(meal_id) {
    // Find item in master data
    const item = foodData.find(f => String(f.meal_id) === String(meal_id));
    if (!item) return console.error("Item not found");
    
    // Check if already in cart
    const existing = cart.find(c => String(c.meal_id) === String(meal_id));
    let cookiesStr =JSON.parse(localStorage.getItem("Cookies"))||[];

    if(cookiesStr.length===0){
        console.log("No Cookies Found, Getting Location...");
        setTimeout(()=>{
           init();
        },4000)
    }

    if (cookiesStr.length > 0) {
        console.log("Cookies Found, Checking Expiry...");
        let cookies = cookiesStr[0]; // parse string to object
        console.log("Cookies:",cookies);
        console.log(cookiesStr.length)

        let expiryTime = new Date(cookies.expiry).getTime();
        console.log("Expiry Time:",expiryTime);
        let now = Date.now(); // current time in ms
    
        // Check if cookie expired (>10 hours)
        if (now - expiryTime > 36000000) { 
            init(); // update location
        }
    }

    let locationData=cookiesStr[0];
    console.log("Location Data:",locationData);
    let loc1={lat:locationData.lat,lng:locationData.lng};
    let loc2=JSON.parse(item.location);
    let distance=getDistanceInMeters(loc1,loc2);
    console.log("Distance in meters:",distance);
    let deliveryFee=0;
    if(distance<=1000){
        deliveryFee=25;
    }else if(distance>1000){
        let addedDistance=distance-1000;
        let extraFee=addedDistance*0.01;
        console.log("Extra Fee:",extraFee);
        deliveryFee=25+extraFee;
        console.log("Total Delivery Fee: R",deliveryFee);
    }
    
    if (existing) {
        existing.qty++;
    } else {
        cart.push({ 
            meal_id: item.meal_id,
            meal_name: item.meal_name,
            SellingPrice: item.SellingPrice,
            Images: item.Images,
            storename: item.storename,
            id:item.store_id,
            location: JSON.parse(item.location),
            qty: 1,
            deliveryFee:deliveryFee
        });
    }
    
    saveCartToLocalStorage();
    updateCartUI();
    toggleCart(true); // Open cart to show user
    
    // Re-render food grid to update button states
    renderFood(currentFilter, document.getElementById('searchInput').value);
    currentCartStoreFilter = 'all'; 
    
    saveCartToLocalStorage();
    updateCartUI();
    toggleCart(true);
}

function updateCartQty(meal_id, change) {
    const val = parseInt(change); 
    const index = cart.findIndex(c => String(c.meal_id) === String(meal_id));
    
    if (index === -1) return;
    
    cart[index].qty += val;
    
    if (cart[index].qty <= 0) {
        cart.splice(index, 1);
    }
    
    saveCartToLocalStorage();
    updateCartUI();
    
    // Re-render food grid to update button states
    renderFood(currentFilter, document.getElementById('searchInput').value);
}

function updateCartUI() {
    const cartList = document.getElementById('cartItems');
    const badge = document.getElementById('cart-badge');
    const subtotalEl = document.getElementById('cartSubtotal');
    const totalEl = document.getElementById('cartTotal');
    
    // 1. Update Badge (Always show total count of all items)
    const totalCount = cart.reduce((acc, item) => acc + item.qty, 0);
    badge.innerText = totalCount;
    
    if (cart.length === 0) {
        cartList.innerHTML = '<div class="empty-cart-msg">Your cart is empty.</div>';
        subtotalEl.innerText = 'R0.00';
        totalEl.innerText = 'R0.00';
        return;
    }

    // 2. Get Unique Stores from Cart for the Filter Bar
    const uniqueStores = [...new Set(cart.map(item => item.storename))];
    
    // 3. Create Filter UI
    let filterHTML = `<div class="cart-filters" style="padding: 10px; display: flex; gap: 5px; overflow-x: auto;">
        <button class="filter-chip ${currentCartStoreFilter === 'all' ? 'active' : ''}" 
                onclick="setCartStoreFilter('all')" 
                style="padding: 5px 10px; border-radius: 15px; border: 1px solid #ccc; background: ${currentCartStoreFilter === 'all' ? '#ff4757' : '#fff'}; color: ${currentCartStoreFilter === 'all' ? '#fff' : '#000'}">
            All
        </button>`;
    
    uniqueStores.forEach(store => {
        const isActive = currentCartStoreFilter === store;
        filterHTML += `
            <button class="filter-chip ${isActive ? 'active' : ''}" 
                    onclick="setCartStoreFilter('${store}')"
                    style="padding: 5px 10px; border-radius: 15px; border: 1px solid #ccc; background: ${isActive ? '#ff4757' : '#fff'}; color: ${isActive ? '#fff' : '#000'}">
                ${store}
            </button>`;
    });
    filterHTML += `</div><hr>`;

    // 4. Filter Items to Display
    const itemsToDisplay = currentCartStoreFilter === 'all' 
        ? cart 
        : cart.filter(item => item.storename === currentCartStoreFilter);

    // 5. Render Items and Calculate Totals
    cartList.innerHTML = filterHTML;
    
    let subtotal = 0;
    let displayedDeliveryFee = 0;

    itemsToDisplay.forEach(item => {
        const itemTotal = parseFloat(item.SellingPrice) * item.qty;
        subtotal += itemTotal;
        
        // We track delivery fee based on the filtered selection
        displayedDeliveryFee = item.deliveryFee; 

        let imgPath = (item.Images && item.Images.length > 0) ? item.Images[0] : '';
        const el = document.createElement('div');
        el.className = 'cart-item';
        el.innerHTML = `
            <img src="/${imgPath}" alt="Food" onerror="this.src='https://placehold.co/100x100?text=Food'">
            <div class="cart-item-details">
                <div class="cart-item-title">${item.meal_name}</div>
                <div class="cart-item-store" style="font-size: 10px; color: gray;">${item.storename}</div>
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

    subtotalEl.innerText = 'R' + displayedDeliveryFee.toFixed(2);
    totalEl.innerText = 'R' + (subtotal + displayedDeliveryFee).toFixed(2);

    // Update Checkout Button Text
    const checkoutBtn = document.getElementById("checkout-btn");
    if (currentCartStoreFilter === 'all') {
        checkoutBtn.innerText = "Checkout All Items";
    } else {
        checkoutBtn.innerText = `Checkout ${currentCartStoreFilter} Order`;
    }
}

function setCartStoreFilter(storeName) {
    currentCartStoreFilter = storeName;
    updateCartUI();
}

// --- CART DRAWER ---
function toggleCart(forceOpen = false) {
    const drawer = document.getElementById('cartDrawer');
    const overlay = document.getElementById('cartOverlay');
    
    if (forceOpen) {
        drawer.classList.add('open');
        overlay.classList.add('open');
    } else {
        drawer.classList.toggle('open');
        overlay.classList.toggle('open');
    }
}

// --- FILTER & SEARCH ---
function setFilter(type, btn) {
    currentFilter = type;
    document.querySelectorAll('.category-chip').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    filterFood();
}

function filterFood() {
    const searchVal = document.getElementById('searchInput').value;
    renderFood(currentFilter, searchVal);
}

// --- SIDEBAR MOBILE ---
function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
}
// --- CHECKOUT LOGIC ---
document.getElementById("checkout-btn").addEventListener("click", () => {
    // 1. Determine which items to checkout
    const filteredOrders = currentCartStoreFilter === 'all' 
        ? cart 
        : cart.filter(item => item.storename === currentCartStoreFilter);

    if (filteredOrders.length === 0) return alert("No items selected for checkout!");

    // Optional: Prevent checking out from "All" if you want to force store-by-store
    if (currentCartStoreFilter === 'all' && [...new Set(cart.map(i => i.storename))].length > 1) {
        return alert("Please select a specific store to checkout.");
    }

    document.getElementById("loading").style.display = "flex";

    // 2. Calculate totals for the SELECTED items only
    let subtotal = 0;
    filteredOrders.forEach(item => {
        subtotal += parseFloat(item.SellingPrice) * item.qty;
    });
    
    // Use the delivery fee from the first item of this store group
    const deliveryFee = filteredOrders[0].deliveryFee;
    const finalTotal = subtotal + deliveryFee;

    // 3. Location & Cookie Logic (Keep your existing check)
    let cookiesStr = JSON.parse(localStorage.getItem("Cookies")) || [];
    if (cookiesStr.length === 0) {
        init();
        document.getElementById("loading").style.display = "none";
        return alert("Acquiring location... please try again in a moment.");
    }
    let locationData = cookiesStr[0];

    // 4. Send ONLY filtered items to the gateway
    fetch("http://localhost:4000/gateway", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ 
            orders: filteredOrders, 
            Total: finalTotal, 
            location: locationData
        })
    })
    .then(res => res.json())
    .then(data => {
        if (data.Status) {
            // 5. SUCCESS: Remove ONLY the purchased items from the cart
            if (currentCartStoreFilter === 'all') {
                cart = []; // If they checked out 'all', clear everything
            } else {
                // Keep items that belong to OTHER stores
                cart = cart.filter(item => item.storename !== currentCartStoreFilter);
            }
            
            saveCartToLocalStorage();
            currentCartStoreFilter = 'all'; // Reset filter
            updateCartUI();
            
            document.getElementById("loading").style.display = "none";
            window.location.href = data.RedirectURL;
        } else {
            document.getElementById("loading").style.display = "none";
            alert("Checkout failed: " + (data.reason || "Unknown error"));
        }
    })
    .catch(err => {
        document.getElementById("loading").style.display = "none";
        console.error(err);
    });
});

// --- CLEAR CART FUNCTION (Optional) ---
function clearCart() {
    if (confirm("Are you sure you want to clear your cart?")) {
        cart = [];
        saveCartToLocalStorage();
        updateCartUI();
        renderFood(currentFilter, document.getElementById('searchInput').value);
    }
}

document.getElementById("logout").addEventListener("click",e=>{
  e.preventDefault();
  fetch("/logout",{
    method:"GET",
    headers:{"content-type":"application/json"}
  }).then(res=>res.json()).then(data=>{
    console.log(data)
    if(data.Status){
      return window.location.href='/signup';
    }
  }).catch(err=>console.log(err))
 })