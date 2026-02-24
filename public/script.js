// ======================================================
// YOUR PORTFOLIO DATA
// ======================================================

const designs = [
    { id: 1, name: "Black Glassy 3d Portfolio", price: 800, type: 'video', src: "videos/Recording 2026-02-19 114929.mp4" },
    { id: 2, name: "Tech Slideshow Animated Portfolio", price: 500, type: 'video', src: "videos/animated -2.mp4" }, 
    { id: 3, name: "Green Animated Portfolio", price: 500, type: 'video', src: "videos/animated-1.mp4" },
    { id: 4, name: "Glassy Landing Page", price: 350, type: 'video', src: "videos/landing -1.mp4" },
    { id: 5, name: "Simple Animated Landing Page", price: 350, type: 'video', src: "videos/landing-2.mp4" },
    { id: 6, name: "HAcking Type Animated Portfolio", price: 500, type: 'video', src: "videos/animated-3.mp4" },
    { id: 7, name: "Sine Design 3d Portfolio", price: 800, type: 'video', src: "videos/3d-3.mp4" },
    { id: 8, name: "Fully Animated 3d Portfolio", price: 800, type: 'video', src: "videos/3d-2.mp4" },
    { id: 9, name: "Fully Animated Portfolio", price: 500, type: 'video', src: "videos/3d-4.mp4" },
    { id: 10, name: "Animation with Bug", price: 500  , type: 'video', src: "videos/animated-4.mp4" },
    { id: 11, name: "Space Animated Portfolio", price: 500, type: 'video', src: "videos/animated-5.mp4" },
    { id: 12, name: "E-Commerce", price: 500, type: 'video', src: "videos/animated-6.mp4" }
];

// --- RENDER LOGIC ---
const grid = document.getElementById('product-grid');

function renderDesigns() {
    if(!grid) return; 
    grid.innerHTML = designs.map(design => {
        let mediaHTML = '';
        if (design.type === 'video') {
            // Uses #t=0.001 for thumbnail, preloads metadata
            mediaHTML = `<video src="${design.src}#t=0.001" class="card-media" loop muted playsinline preload="metadata"></video>`;
        } else {
            mediaHTML = `<img src="${design.src}" alt="${design.name}" class="card-media">`;
        }

        // Removed the tilt functions and replaced them with handleHover and handleLeave
        return `
        <div class="card" onmouseenter="handleHover(this)" onmouseleave="handleLeave(this)">
            <div class="media-container">
                ${mediaHTML}
            </div>
            <div class="card-content">
                <h3 class="card-title">${design.name}</h3>
                <span class="card-price">₹${design.price}</span>
                <button class="btn-buy" onclick="addToCart(${design.id})">Add to Cart</button>
            </div>
        </div>
        `;
    }).join('');
}

// --- VIDEO HOVER (Tilt Effect Removed) ---
function handleHover(card) {
    // Play video when the mouse enters the card
    const video = card.querySelector('video');
    if (video && video.paused) {
        let playPromise = video.play();
        if (playPromise !== undefined) {
            playPromise.catch(error => {
                console.log("Playback prevented until user interaction", error);
            });
        }
    }
}

function handleLeave(card) {
    // Pause video when mouse leaves the card
    const video = card.querySelector('video');
    if (video && !video.paused) {
        video.pause();
    }
}

function resetCard(card) {
    card.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg)`;

    // FIXED: Pause video when mouse leaves
    const video = card.querySelector('video');
    if (video && !video.paused) {
        video.pause();
    }
}

// --- SCROLL ANIMATION ---
const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
        if (entry.isIntersecting) { entry.target.classList.add('show'); }
    });
});
document.querySelectorAll('.hidden').forEach((el) => observer.observe(el));

// --- CART & CHECKOUT ---
let cart = [];
const cartCountEl = document.getElementById('cart-count');
const cartModal = document.getElementById('cart-modal');
const cartItemsContainer = document.getElementById('cart-items');
const totalPriceEl = document.getElementById('total-price');
const stepCart = document.getElementById('step-cart');
const stepCheckout = document.getElementById('step-checkout');

function addToCart(id) {
    const item = designs.find(d => d.id === id);
    if(item) {
        cart.push(item);
        // ADDED THIS LINE: Forces a popup to prove it worked
        alert(`${item.name} was successfully added to your cart!`); 
        updateCartUI();
    } else {
        alert("Error: Could not find item data.");
    }
}

function removeFromCart(index) {
    cart.splice(index, 1);
    updateCartUI();
}

function updateCartUI() {
    if(cartCountEl) cartCountEl.innerText = cart.length;
    
    let total = 0;
    if (cart.length === 0) {
        if(cartItemsContainer) cartItemsContainer.innerHTML = '<p>Your cart is empty.</p>';
        if(totalPriceEl) totalPriceEl.innerText = '0';
        if(document.getElementById('checkout-btn')) document.getElementById('checkout-btn').style.display = 'none';
    } else {
        total = cart.reduce((sum, item) => sum + item.price, 0);
        if(cartItemsContainer) {
            cartItemsContainer.innerHTML = cart.map((item, index) => `
                <div style="display:flex; justify-content:space-between; margin:10px 0; border-bottom:1px solid #333; padding-bottom:10px;">
                    <span>${item.name}</span>
                    <div>
                        <span style="color:#03dac6">₹${item.price}</span>
                        <span style="color:red; cursor:pointer; margin-left:10px;" onclick="removeFromCart(${index})">&times;</span>
                    </div>
                </div>
            `).join('');
        }
        if(totalPriceEl) totalPriceEl.innerText = total;
        if(document.getElementById('checkout-btn')) document.getElementById('checkout-btn').style.display = 'block';
    }
    return total;
}

function openCart() { 
    if(cartModal) cartModal.style.display = 'block'; 
    if(stepCart) stepCart.style.display = 'block'; 
    if(stepCheckout) stepCheckout.style.display = 'none'; 
}

function closeModal() { 
    if(cartModal) cartModal.style.display = 'none'; 
}

function goToCheckout() { 
    if(stepCart) stepCart.style.display = 'none'; 
    if(stepCheckout) stepCheckout.style.display = 'block'; 
}

function backToCart() { 
    if(stepCheckout) stepCheckout.style.display = 'none'; 
    if(stepCart) stepCart.style.display = 'block'; 
}

// --- RAZORPAY INTEGRATION ---
document.getElementById('rzp-button1').onclick = async function(e) {
    e.preventDefault();

    const emailField = document.getElementById('customer-email');
    if(!emailField.value) {
        alert("Please enter your email for file delivery.");
        return;
    }

    // 1. Calculate Total Amount from Cart
    // Razorpay expects amount in PAISE (1 Rupee = 100 Paise)
    const cartTotal = cart.reduce((sum, item) => sum + item.price, 0);
    const amountInPaise = cartTotal * 100; 

    if(amountInPaise === 0) {
        alert("Cart is empty");
        return;
    }

    try {
        // 2. Send Calculated Amount to Server
        const response = await fetch('/create-order', { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount: amountInPaise }) // Sending dynamic amount
        });
        
        const order = await response.json(); 
        
        if (!order.id) {
            alert("Error creating order. Please try again.");
            return;
        }

        // 3. Configure Razorpay Popup
        var options = {
            "key": "rzp_test_SHcTCPb8RlHOiw", // Your Key ID
            "amount": order.amount, // Using the amount returned from server
            "currency": "INR",
            "name": "Portfoli.io",
            "description": "Premium Designs Purchase",
            "order_id": order.id, 
            "handler": async function (response){
                // 4. Verify Payment
                const verifyRes = await fetch('/verify-payment', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        razorpay_order_id: response.razorpay_order_id,
                        razorpay_payment_id: response.razorpay_payment_id,
                        razorpay_signature: response.razorpay_signature
                    })
                });

                const verifyData = await verifyRes.json();
                if(verifyData.success){
                    alert("Payment Successful! Files sent to " + emailField.value);
                    cart = []; // Clear Cart
                    updateCartUI();
                    closeModal();
                } else {
                    alert("Verification Failed.");
                }
            },
            "prefill": {
                "name": document.getElementById('name') ? document.getElementById('name').value : "Guest",
                "email": emailField.value,
                "contact": "9999999999"
            },
            "theme": { "color": "#3399cc" }
        };

        var rzp1 = new Razorpay(options);
        rzp1.on('payment.failed', function (response){
            alert("Payment Failed: " + response.error.description);
        });
        rzp1.open();

    } catch (err) {
        console.error("Payment Error:", err);
        alert("Something went wrong. Check console.");
    }
}

// Contact Form
function handleContact(e) { 
    e.preventDefault(); 
    // You can add your EmailJS logic here if needed
    alert("Message Sent!"); 
}

// Initial Render
renderDesigns();


document.addEventListener("DOMContentLoaded", function () {

    emailjs.init("3uuV1oC56POLbpVkn");

    document.getElementById("contact-form")
    .addEventListener("submit", function (event) {

        event.preventDefault();

        const form = this;

        emailjs.sendForm("service_2e7rdkf", "template_jtwpidi", form)
        .then(function () {

            // Show success message
            document.getElementById("successMessage").style.display = "block";

            // Reset form
            form.reset();

            // Hide after 3 seconds
            setTimeout(function () {
                document.getElementById("successMessage").style.display = "none";
            }, 3000);

        })
        .catch(function (error) {
            console.log("FAILED...", error);
            alert("Something went wrong. Try again.");
        });

    });

});