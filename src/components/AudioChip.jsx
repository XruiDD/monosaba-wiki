import { useRef, useState } from "react";

export default function AudioChip({ s }) {
  const [playing, setPlaying] = useState(false);
  const ref = useRef(null);

  const toggle = () => {
    if (!ref.current) {
      ref.current = new Audio(`assets/sounds/${s.f}`);
      ref.current.volume = 0.55;
      ref.current.addEventListener("ended", () => setPlaying(false));
    }
    if (playing) {
      ref.current.pause();
      ref.current.currentTime = 0;
      setPlaying(false);
    } else {
      ref.current.play().catch(() => {});
      setPlaying(true);
    }
  };

  return (
    <button className={`audio-chip ${playing ? "playing" : ""}`} onClick={toggle}>
      <div className="ac-icon">{playing ? "■" : "▶"}</div>
      <div>
        <div className="ac-name serif">{s.n}</div>
        <div className="ac-file mono faint">{s.f}</div>
      </div>
      {playing && <div className="ac-wave"><span/><span/><span/><span/></div>}
    </button>
  );
}
