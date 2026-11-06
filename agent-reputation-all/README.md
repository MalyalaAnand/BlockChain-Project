# Agent Reputation: all code

| Folder | What it is | How to run |
| --- | --- | --- |
| `website-standalone/` | The finished website (mobile and laptop UI) as a single `index.html` | Open the file in a browser, or upload it to any static host |
| `website-with-google-login/` | The same website plus a small Node server for real Google sign-in and the device-only Admin log | See its `README.md` (Node 20.6+, `npm install`, `npm start`) |
| `blockchain-contract-project/` | Solidity contract, Hardhat tests, Express backend and React frontend | See its `README.md` |

## Notes
- The standalone page keeps all data in your browser. Email sign-up works there; Google sign-in and the cross-device Admin log need the `website-with-google-login` version.
- Email accounts store a hashed password in the browser only.
- Voice input works in Chrome, Edge and Safari (not Firefox).
