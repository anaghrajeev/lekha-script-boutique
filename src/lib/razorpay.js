export const loadRazorpay = () => {
  return Promise.resolve(true); // Mock successful load
};

export const initializePayment = async ({
  amount,
  currency = 'INR',
  name = 'Lekha Boutique',
  description = 'Order Payment',
  customerName,
  customerEmail,
  customerPhone,
  onSuccess,
  onError
}) => {
  // Since we don't have real Razorpay API keys yet, we simulate the payment flow
  console.log('Initializing Mock Payment Gateway...', { amount, customerName });
  
  // Create a fake modal overlay
  const overlay = document.createElement('div');
  overlay.style.position = 'fixed';
  overlay.style.top = '0';
  overlay.style.left = '0';
  overlay.style.width = '100vw';
  overlay.style.height = '100vh';
  overlay.style.backgroundColor = 'rgba(0,0,0,0.5)';
  overlay.style.zIndex = '9999';
  overlay.style.display = 'flex';
  overlay.style.alignItems = 'center';
  overlay.style.justifyContent = 'center';
  
  const modal = document.createElement('div');
  modal.style.backgroundColor = 'white';
  modal.style.padding = '32px';
  modal.style.borderRadius = '16px';
  modal.style.textAlign = 'center';
  modal.style.boxShadow = '0 10px 25px rgba(0,0,0,0.2)';
  modal.style.maxWidth = '400px';
  modal.style.width = '90%';
  
  modal.innerHTML = `
    <h2 style="margin-top:0; color: #7A3580; font-family: sans-serif;">${name}</h2>
    <p style="color: #666; font-family: sans-serif;">${description}</p>
    <h1 style="margin: 24px 0; font-family: sans-serif;">₹${amount.toLocaleString()}</h1>
    <p style="color: #666; font-family: sans-serif; font-size: 14px;">Mock Payment Gateway</p>
    
    <div style="display: flex; gap: 12px; margin-top: 24px;">
      <button id="mock-fail-btn" style="flex: 1; padding: 12px; background: #eee; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; color: #333;">Fail</button>
      <button id="mock-success-btn" style="flex: 1; padding: 12px; background: #7A3580; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; color: white;">Success</button>
    </div>
  `;
  
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  
  document.getElementById('mock-success-btn').onclick = () => {
    document.body.removeChild(overlay);
    if(onSuccess) {
      onSuccess({
         paymentId: 'pay_mock_' + Math.floor(Math.random() * 1000000),
         orderId: 'order_mock_' + Math.floor(Math.random() * 1000000),
         signature: 'mock_signature'
      });
    }
  };
  
  document.getElementById('mock-fail-btn').onclick = () => {
    document.body.removeChild(overlay);
    if(onError) {
      onError(new Error("Payment failed or cancelled by user"));
    }
  };
};
