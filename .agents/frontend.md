# Frontend Agent Rules

## Tech Stack
- React 18, Vite, React Router DOM
- Web3: ethers.js
- Styling: Tailwind CSS (or standard CSS modules)

## Component Guidelines
- Write strictly functional components using modern React Hooks.
- Avoid all deprecated React lifecycle methods.
- UI State Management: The core UI states are "Pending", "Verified Authentic", and "Flagged: AI Generated". Ensure components handle these transitions dynamically based on backend/Web3 polling.

## Web3 Integration
- Use `ethers.js` to handle wallet connections.
- Always check if `window.ethereum` exists before prompting a wallet connection.
- Gracefully handle user rejections (e.g., user clicking "Reject" in MetaMask).