import React, { useState, useRef, useEffect } from 'react';
import { Upload, Play, Pause, Volume2, VolumeX, Mic } from 'lucide-react';
import WaveSurfer from 'wavesurfer.js';
import * as Tone from 'tone';

interface Track {
  id: string;
  name: string;
  audioBuffer: AudioBuffer;
  player: Tone.Player;
  panner: Tone.Panner;
  pitchShift: Tone.PitchShift;
  muted: boolean;
  solo: boolean;
  volume: number;
  pan: number;
  pitch: number;
  blob: Blob;
}

const App: React.FC = () => {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const wavesurferRefs = useRef<{ [key: string]: WaveSurfer | null }>({});

  useEffect(() => {
    Tone.start();
  }, []);

  useEffect(() => {
    tracks.forEach((track) => {
      if (!wavesurferRefs.current[track.id]) {
        const wavesurfer = WaveSurfer.create({
          container: `#waveform-${track.id}`,
          waveColor: 'violet',
          progressColor: 'purple',
          responsive: true,
          height: 50,
        });
        wavesurfer.loadBlob(track.blob);
        wavesurferRefs.current[track.id] = wavesurfer;
      }
    });
  }, [tracks]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const arrayBuffer = await file.arrayBuffer();
      const audioBuffer = await Tone.context.decodeAudioData(arrayBuffer);

      const player = new Tone.Player(audioBuffer);
      const panner = new Tone.Panner(0).toDestination();
      const pitchShift = new Tone.PitchShift(0).connect(panner);
      player.connect(pitchShift);

      const newTrack: Track = {
        id: `track-${Date.now()}-${i}`,
        name: file.name,
        audioBuffer,
        player,
        panner,
        pitchShift,
        muted: false,
        solo: false,
        volume: 0,
        pan: 0,
        pitch: 0,
        blob: file,
      };

      setTracks(prevTracks => [...prevTracks, newTrack]);
    }
  };

  const togglePlayPause = () => {
    if (isPlaying) {
      Tone.Transport.pause();
    } else {
      Tone.Transport.start();
      tracks.forEach(track => track.player.start());
    }
    setIsPlaying(!isPlaying);
  };

  const handleMute = (trackId: string) => {
    setTracks(prevTracks =>
      prevTracks.map(track =>
        track.id === trackId ? { ...track, muted: !track.muted } : track
      )
    );
    const track = tracks.find(t => t.id === trackId);
    if (track) {
      track.player.mute = !track.muted;
    }
  };

  const handleSolo = (trackId: string) => {
    setTracks(prevTracks => {
      const updatedTracks = prevTracks.map(track =>
        track.id === trackId ? { ...track, solo: !track.solo } : track
      );
      const hasSoloTrack = updatedTracks.some(track => track.solo);
      return updatedTracks.map(track => ({
        ...track,
        muted: hasSoloTrack ? !track.solo : track.muted
      }));
    });
  };

  const handleVolumeChange = (trackId: string, volume: number) => {
    setTracks(prevTracks =>
      prevTracks.map(track =>
        track.id === trackId ? { ...track, volume } : track
      )
    );
    const track = tracks.find(t => t.id === trackId);
    if (track) {
      track.player.volume.value = volume;
    }
  };

  const handlePanChange = (trackId: string, pan: number) => {
    setTracks(prevTracks =>
      prevTracks.map(track =>
        track.id === trackId ? { ...track, pan } : track
      )
    );
    const track = tracks.find(t => t.id === trackId);
    if (track) {
      track.panner.pan.value = pan;
    }
  };

  const handlePitchChange = (trackId: string, pitch: number) => {
    setTracks(prevTracks =>
      prevTracks.map(track =>
        track.id === trackId ? { ...track, pitch } : track
      )
    );
    const track = tracks.find(t => t.id === trackId);
    if (track) {
      track.pitchShift.pitch = pitch;
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Tone.Transport.seconds);
    }, 100);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-4">Multi-track Audio Editor</h1>
      <div className="mb-4">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          multiple
          accept="audio/*"
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="bg-blue-500 text-white px-4 py-2 rounded mr-2"
        >
          <Upload className="inline-block mr-2" />
          Upload Audio
        </button>
        <button
          onClick={togglePlayPause}
          className="bg-green-500 text-white px-4 py-2 rounded"
        >
          {isPlaying ? <Pause className="inline-block" /> : <Play className="inline-block" />}
          {isPlaying ? 'Pause' : 'Play'}
        </button>
      </div>
      <div className="mb-4">
        <div className="bg-gray-200 h-8 relative">
          <div
            className="bg-blue-500 h-full absolute"
            style={{ width: `${(currentTime / (Tone.Transport.duration || 1)) * 100}%` }}
          ></div>
        </div>
        <p>Current Time: {currentTime.toFixed(2)}s</p>
      </div>
      {tracks.map((track) => (
        <div key={track.id} className="mb-4 p-4 border rounded">
          <h3 className="font-bold">{track.name}</h3>
          <div id={`waveform-${track.id}`} className="mb-2"></div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => handleMute(track.id)}
              className={`p-2 rounded ${track.muted ? 'bg-red-500' : 'bg-gray-300'}`}
            >
              {track.muted ? <VolumeX /> : <Volume2 />}
            </button>
            <button
              onClick={() => handleSolo(track.id)}
              className={`p-2 rounded ${track.solo ? 'bg-yellow-500' : 'bg-gray-300'}`}
            >
              <Mic />
            </button>
            <div className="flex items-center">
              <span className="mr-2">Volume:</span>
              <input
                type="range"
                min="-60"
                max="0"
                value={track.volume}
                onChange={(e) => handleVolumeChange(track.id, Number(e.target.value))}
              />
            </div>
            <div className="flex items-center">
              <span className="mr-2">Pan:</span>
              <input
                type="range"
                min="-1"
                max="1"
                step="0.1"
                value={track.pan}
                onChange={(e) => handlePanChange(track.id, Number(e.target.value))}
              />
            </div>
            <div className="flex items-center">
              <span className="mr-2">Pitch:</span>
              <input
                type="range"
                min="-12"
                max="12"
                value={track.pitch}
                onChange={(e) => handlePitchChange(track.id, Number(e.target.value))}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default App;