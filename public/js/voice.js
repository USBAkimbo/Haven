// ═══════════════════════════════════════════════════════════
// Haven — WebRTC Voice Chat Manager
// ═══════════════════════════════════════════════════════════

class VoiceManager {
  constructor(socket) {
    this.socket = socket;
    this.localStream = null;
    this.peers = new Map();       // userId → { connection, stream, username }
    this.currentChannel = null;
    this.isMuted = false;
    this.isDeafened = false;
    this.inVoice = false;
    this.audioCtx = null;         // Web Audio context for volume boost
    this.gainNodes = new Map();   // userId → GainNode

    this.rtcConfig = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    };

    this._setupSocketListeners();
  }

  // ── Socket event listeners ──────────────────────────────

  _setupSocketListeners() {
    // We just joined: create peer connections + send offers to all existing users
    this.socket.on('voice-existing-users', async (data) => {
      for (const user of data.users) {
        await this._createPeer(user.id, user.username, true);
      }
    });

    // Someone new joined our voice channel — they'll send us an offer
    this.socket.on('voice-user-joined', () => {
      // The new user handles creating offers to existing users,
      // so we just wait for their offer via 'voice-offer'.
    });

    // Received an offer — create peer & answer
    this.socket.on('voice-offer', async (data) => {
      const { from, offer } = data;

      let peer = this.peers.get(from.id);
      if (!peer) {
        await this._createPeer(from.id, from.username, false);
        peer = this.peers.get(from.id);
      }

      try {
        await peer.connection.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await peer.connection.createAnswer();
        await peer.connection.setLocalDescription(answer);

        this.socket.emit('voice-answer', {
          code: this.currentChannel,
          targetUserId: from.id,
          answer: answer
        });
      } catch (err) {
        console.error('Error handling voice offer:', err);
      }
    });

    // Received an answer to our offer
    this.socket.on('voice-answer', async (data) => {
      const peer = this.peers.get(data.from.id);
      if (peer) {
        try {
          await peer.connection.setRemoteDescription(new RTCSessionDescription(data.answer));
        } catch (err) {
          console.error('Error handling voice answer:', err);
        }
      }
    });

    // Received an ICE candidate
    this.socket.on('voice-ice-candidate', async (data) => {
      const peer = this.peers.get(data.from.id);
      if (peer && data.candidate) {
        try {
          await peer.connection.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch (err) {
          console.error('Error adding ICE candidate:', err);
        }
      }
    });

    // Someone left voice
    this.socket.on('voice-user-left', (data) => {
      this._removePeer(data.user.id);
    });
  }

  // ── Public API ──────────────────────────────────────────

  async join(channelCode) {
    try {
      // Create/resume AudioContext with user gesture (needed for volume boost)
      if (!this.audioCtx) {
        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (this.audioCtx.state === 'suspended') await this.audioCtx.resume();

      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: false
      });

      this.currentChannel = channelCode;
      this.inVoice = true;
      this.isMuted = false;

      this.socket.emit('voice-join', { code: channelCode });
      return true;
    } catch (err) {
      console.error('Microphone access failed:', err);
      return false;
    }
  }

  leave() {
    if (this.currentChannel) {
      this.socket.emit('voice-leave', { code: this.currentChannel });
    }

    // Close all peer connections
    for (const [id] of this.peers) {
      this._removePeer(id);
    }
    this.gainNodes.clear();

    // Stop local tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach(t => t.stop());
      this.localStream = null;
    }

    this.currentChannel = null;
    this.inVoice = false;
    this.isMuted = false;
    this.isDeafened = false;
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(track => {
        track.enabled = !this.isMuted;
      });
    }
    return this.isMuted;
  }

  toggleDeafen() {
    this.isDeafened = !this.isDeafened;
    // Mute/unmute all incoming audio
    for (const [userId, gainNode] of this.gainNodes) {
      gainNode.gain.value = this.isDeafened ? 0 : this._getSavedVolume(userId);
    }
    // Also mute all audio elements as fallback
    document.querySelectorAll('#audio-container audio').forEach(el => {
      if (this.isDeafened) {
        el.dataset.prevVolume = el.volume;
        el.volume = 0;
      } else {
        el.volume = parseFloat(el.dataset.prevVolume || 1);
      }
    });
    return this.isDeafened;
  }

  // ── Private: Peer connection management ─────────────────

  async _createPeer(userId, username, createOffer) {
    const connection = new RTCPeerConnection(this.rtcConfig);

    // Add our local audio tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        connection.addTrack(track, this.localStream);
      });
    }

    // Handle incoming remote audio
    const remoteStream = new MediaStream();
    connection.ontrack = (event) => {
      event.streams[0].getTracks().forEach(track => {
        remoteStream.addTrack(track);
      });
      this._playAudio(userId, remoteStream);
    };

    // Send ICE candidates to the remote peer via server
    connection.onicecandidate = (event) => {
      if (event.candidate) {
        this.socket.emit('voice-ice-candidate', {
          code: this.currentChannel,
          targetUserId: userId,
          candidate: event.candidate
        });
      }
    };

    connection.onconnectionstatechange = () => {
      if (connection.connectionState === 'failed' ||
          connection.connectionState === 'disconnected') {
        this._removePeer(userId);
      }
    };

    this.peers.set(userId, { connection, stream: remoteStream, username });

    // If we're the initiator, create and send an offer
    if (createOffer) {
      try {
        const offer = await connection.createOffer();
        await connection.setLocalDescription(offer);

        this.socket.emit('voice-offer', {
          code: this.currentChannel,
          targetUserId: userId,
          offer: offer
        });
      } catch (err) {
        console.error('Error creating voice offer:', err);
      }
    }
  }

  _removePeer(userId) {
    const peer = this.peers.get(userId);
    if (peer) {
      peer.connection.close();
      const audioEl = document.getElementById(`voice-audio-${userId}`);
      if (audioEl) audioEl.remove();
      this.gainNodes.delete(userId);
      this.peers.delete(userId);
    }
  }

  // ── Volume Control ──────────────────────────────────────

  setVolume(userId, volume) {
    const gainNode = this.gainNodes.get(userId);
    if (gainNode) {
      // Web Audio GainNode supports values > 1.0 for boost
      gainNode.gain.value = Math.max(0, Math.min(2, volume));
    } else {
      // Fallback: HTMLAudioElement volume (capped at 1.0, no boost)
      const audioEl = document.getElementById(`voice-audio-${userId}`);
      if (audioEl) audioEl.volume = Math.max(0, Math.min(1, volume));
    }
  }

  _getSavedVolume(userId) {
    try {
      const vols = JSON.parse(localStorage.getItem('haven_voice_volumes') || '{}');
      return (vols[userId] ?? 100) / 100;
    } catch { return 1; }
  }

  _playAudio(userId, stream) {
    let audioEl = document.getElementById(`voice-audio-${userId}`);
    if (!audioEl) {
      audioEl = document.createElement('audio');
      audioEl.id = `voice-audio-${userId}`;
      audioEl.autoplay = true;
      audioEl.playsInline = true;
      document.getElementById('audio-container').appendChild(audioEl);
    }
    audioEl.srcObject = stream;

    // Route through Web Audio API for volume boost support (gain > 1.0)
    try {
      if (!this.audioCtx) {
        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (this.audioCtx.state === 'suspended') this.audioCtx.resume();

      const source = this.audioCtx.createMediaStreamSource(stream);
      const gainNode = this.audioCtx.createGain();
      gainNode.gain.value = this._getSavedVolume(userId);
      source.connect(gainNode);
      gainNode.connect(this.audioCtx.destination);
      this.gainNodes.set(userId, gainNode);

      // Mute element playback — audio routes through GainNode instead
      audioEl.volume = 0;
    } catch {
      // Fallback: use element volume directly (no boost beyond 100%)
      audioEl.volume = Math.min(1, this._getSavedVolume(userId));
    }
  }
}
