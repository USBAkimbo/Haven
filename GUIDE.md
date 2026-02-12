# ⬡ Haven — User Guide

Welcome to **Haven**, your private chat server. This guide covers everything you need to get Haven running and invite your friends.

---

## 📋 What You Need

- **Windows 10 or 11** (macOS / Linux can run it manually)
- **Node.js** version 18 or newer → [Download here](https://nodejs.org/)
- About **50 MB** of disk space

---

## 🚀 Getting Started

### Step 1 — First Launch

Double-click **`Start Haven.bat`**

That's it. The batch file will:
1. Check that Node.js is installed
2. Install dependencies (first time only)
3. Generate SSL certificates (first time only)
4. Start the server
5. Open your browser to the login page

### Step 2 — Create Your Admin Account

1. On the login page, click **Register**
2. Create an account with the admin username (default: `admin` — check your data directory's `.env` file)
3. This account can create and delete channels

### Step 3 — Create a Channel

1. In the sidebar, use the **Create Channel** box (admin only)
2. Give it a name like "General" or "Gaming"
3. Haven generates a unique **channel code** (8 characters)
4. Share this code with your friends — it's the only way in

### Step 4 — Invite Friends

Send your friends:
1. Your server address: `https://YOUR_IP:3000`
2. The channel code

They'll register their own account, then enter the code to join your channel.

---

## 🌐 Setting Up Remote Access (Friends Over the Internet)

If your friends are **not** on your local WiFi, you need to set up port forwarding so they can reach your PC from the internet.

### Find Your Public IP

Visit [whatismyip.com](https://whatismyip.com) — the number shown (like `203.0.113.50`) is what your friends will use.

### Port Forwarding on Your Router

Every router is different, but the general steps are:

1. **Log into your router** — usually `http://192.168.1.1` or `http://10.0.0.1` in your browser
2. Find **Port Forwarding** (sometimes called NAT, Virtual Servers, or Applications)
3. Create a new rule:

   | Field | Value |
   |-------|-------|
   | Port | `3000` |
   | Protocol | TCP |
   | Internal IP | Your PC's local IP (e.g. `10.0.0.60`) |

4. Save and apply

> **How to find your local IP:** Open Command Prompt and type `ipconfig`. Look for the "IPv4 Address" under your Ethernet or WiFi adapter.

### Windows Firewall

The server needs permission to accept incoming connections:

1. Open **Start Menu** → search **"Windows Defender Firewall"**
2. Click **"Advanced settings"** on the left
3. Click **"Inbound Rules"** → **"New Rule..."**
4. Select **Port** → **TCP** → enter `3000`
5. Allow the connection → apply to all profiles
6. Name it something like "Haven Chat"

Or run this in PowerShell (as Administrator):
```powershell
New-NetFirewallRule -DisplayName "Haven_Chat" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow
```

### Tell Your Friends

Send them this URL:
```
https://YOUR_PUBLIC_IP:3000
```

> ⚠️ **Certificate Warning:** Your friends' browsers will show a security warning because Haven uses a self-signed certificate. This is normal and expected. Tell them to click **"Advanced"** → **"Proceed to site"**. The connection is still encrypted.

---

## 🔧 Router-Specific Tips

### Xfinity / Comcast (XB7 Gateway)

1. Open the **Xfinity app** on your phone
2. Go to **WiFi** → scroll down → **Advanced settings** → **Port forwarding**
3. Select your PC from the device list
4. Add port `3000` (TCP/UDP) and apply
5. **Important:** Go to **Home** → disable **xFi Advanced Security** — it silently blocks all inbound connections
6. Verify the **reserved IP** in port forwarding matches your PC's actual IP (`ipconfig` to check)

### Common Issues

| Problem | Solution |
|---------|----------|
| **"SSL_ERROR_RX_RECORD_TOO_LONG"** | Browser is using `https://` but server is running HTTP. Change URL to `http://localhost:3000`, or install OpenSSL and restart (see Troubleshooting below) |
| Friends get "took too long to respond" | Port forwarding not set up, or firewall blocking |
| Friends get "connection refused" | Server isn't running — launch `Start Haven.bat` |
| Can't connect with `https://` | Make sure you're using port 3000, not 443 |
| Voice chat doesn't work | Must use `https://` — voice requires a secure connection |
| "Certificate error" in browser | Normal — click Advanced → Proceed |

---

## 🎨 Themes

Haven comes with 6 themes. Switch between them using the theme buttons at the bottom of the left sidebar:

| Button | Theme | Style |
|--------|-------|-------|
| ⬡ | **Haven** | Deep blue/purple (default) |
| 🎮 | **Discord** | Dark gray with blue accents |
| Ⅿ | **Matrix** | Black and green, scanline overlay |
| ◈ | **Tron** | Black with neon cyan glow |
| ⌁ | **HALO** | Military green with Mjolnir vibes |
| ⚜ | **LoTR** | Parchment gold and deep brown |
| 🌆 | **Cyberpunk** | Neon pink and electric yellow |
| ❄ | **Nord** | Arctic blue and frost |
| 🧛 | **Dracula** | Deep purple and blood red |
| ⚔ | **Bloodborne** | Gothic crimson and ash |
| ⬚ | **Ice** | Pale blue and white |
| 🌊 | **Abyss** | Deep ocean darkness |

Your theme choice is saved per browser.

---

## 🎤 Voice Chat

1. Join a text channel first
2. Click **🎤 Join Voice** in the channel header
3. Allow microphone access when your browser asks
4. Click **🔇 Mute** to toggle your mic
5. Click **📞 Leave** to disconnect from voice

Voice chat is **peer-to-peer** — audio goes directly between you and other users, not through the server.

> Voice requires HTTPS. If you're running locally, use `https://localhost:3000`. For remote connections, use `https://YOUR_IP:3000`.

---

## ⚙️ Configuration

All settings are in the `.env` file in your **data directory**:

| OS | Data Directory |
|----|---------------|
| Windows | `%APPDATA%\Haven\` |
| Linux / macOS | `~/.haven/` |

| Setting | What it does |
|---------|-------------|
| `PORT` | Server port (default: 3000) |
| `ADMIN_USERNAME` | Which username gets admin powers |
| `JWT_SECRET` | Auto-generated security key — don't share this |
| `HAVEN_DATA_DIR` | Override where data is stored |

> `.env` is created automatically on first launch. If you change it, restart the server.

---

## 💡 Tips

- **Bookmark the URL** — so you don't have to type the IP every time
- **Keep the bat window open** — closing it stops the server
- **Your data is stored separately** — all messages, config, and uploads are in your data directory (`%APPDATA%\Haven` on Windows, `~/.haven` on Linux/macOS), not in the Haven code folder
- **Back up your data directory** — copy it somewhere safe to preserve your chat history
- **Channel codes are secrets** — treat them like passwords. Anyone with the code can join.

---

## 🆘 Troubleshooting

**"SSL_ERROR_RX_RECORD_TOO_LONG" or "ERR_SSL_PROTOCOL_ERROR" in browser**
→ Your browser is trying to connect via `https://` but the server is actually running in HTTP mode. This happens when SSL certificates weren't generated (usually because OpenSSL isn't installed).
**Quick fix:** Change the URL in your browser from `https://localhost:3000` to `http://localhost:3000`.
**Permanent fix:** Install OpenSSL so Haven can generate certificates:
1. Download from [slproweb.com/products/Win32OpenSSL.html](https://slproweb.com/products/Win32OpenSSL.html) (the "Light" version is fine)
2. During install, choose **"Copy OpenSSL DLLs to the Windows system directory"**
3. **Restart your PC** (so OpenSSL is added to PATH)
4. Delete the `certs` folder in your data directory (`%APPDATA%\Haven\certs`)
5. Re-launch `Start Haven.bat` — it will regenerate certificates and start in HTTPS mode

**How to tell if you're running HTTP or HTTPS:**
Check the server's startup banner in the terminal. If it says `http://localhost:3000` — you're on HTTP. If it says `https://localhost:3000` — you're on HTTPS. The protocol in the URL you use must match.

**"Node.js is not installed"**
→ Download and install from [nodejs.org](https://nodejs.org/). Restart your PC after installing.

**Server starts but browser shows blank page**
→ Try clearing your browser cache, or open in an incognito/private window.

**Friends can connect locally but not remotely**
→ Port forwarding isn't configured correctly. Double-check the port, protocol, and internal IP.

**"Error: EADDRINUSE"**
→ Another program is using port 3000. Close it, or change the port in `.env`.

**Voice chat echoes**
→ Use headphones to prevent your speakers from feeding into your microphone.

---

<p align="center">
  <b>⬡ Haven</b> — Your server. Your rules.
</p>
