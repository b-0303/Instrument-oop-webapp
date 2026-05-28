import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

class InstrumentADT {
  get name() { throw new Error("name must be implemented"); }
  get brand() { throw new Error("brand must be implemented"); }
  get isTune() { throw new Error("isTune must be implemented"); }
  information() { throw new Error("information() must be implemented"); }
  playMethod() { throw new Error("playMethod() must be implemented"); }
  tuneMessage() { throw new Error("tuneMessage() must be implemented"); }
}

class Instrument extends InstrumentADT {
  constructor({ id, type, name, brand, isTune = false }) {
    super();
    this.id = id;
    this.type = type;
    this._name = name;
    this._brand = brand;
    this._isTune = isTune;
  }
  get name() { return this._name; }
  get brand() { return this._brand; }
  get isTune() { return this._isTune; }
  information() { return { name: this.name, brand: this.brand, isTune: this.isTune }; }
  playMethod() { return `${this.name}의 연주 방법`; }
  tuneMessage() { return `${this.name} 조율이 완료되었습니다.`; }
}

class Guitar extends Instrument {
  constructor() { super({ id: "guitar", type: "Guitar", name: "Jazzmaster", brand: "Fender" }); }
  playMethod() { return "왼손으로 음을 조절하고, 오른손으로 줄을 튕겨 연주합니다."; }
  tuneMessage() { return "헤드머신을 조절하여 Jazzmaster의 조율을 완료했습니다."; }
}

class Piano extends Instrument {
  constructor() { super({ id: "piano", type: "Piano", name: "U1", brand: "YAMAHA" }); }
  playMethod() { return "건반을 눌러 연주하며, 필요에 따라 페달을 사용하기도 합니다."; }
  tuneMessage() { return "튜닝 해머로 U1 피아노의 현을 조율했습니다."; }
}

class Drum extends Instrument {
  constructor() { super({ id: "drum", type: "Drum", name: "Masters Maple Pure", brand: "Pearl" }); }
  playMethod() { return "스틱으로 각 부분을 두드려 연주하며, 발로 킥 드럼을 연주하기도 합니다."; }
  tuneMessage() { return "드럼 조율키로 Masters Maple Pure의 장력을 맞췄습니다."; }
  stickMessage(stickCount) {
    if (stickCount < 2) return "스틱이 부족하여 2개로 보충했습니다.";
    return "스틱이 준비되어 있습니다.";
  }
}

const instruments = [new Guitar(), new Piano(), new Drum()];

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const methodLog = (methodName, message) => `${methodName}\n${message}`;

function playSynthSound(type) {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;
  const ctx = new AudioContext();
  const master = ctx.createGain();
  master.gain.value = 0.28;
  master.connect(ctx.destination);

  const stopAt = ctx.currentTime + 2.1;
  if (type === "guitar") {
    // electric guitar-like bright pluck: sawtooth + short envelope
    [196, 247, 330, 392, 494].forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(freq, ctx.currentTime + index * 0.09);
      filter.type = "highpass";
      filter.frequency.value = 700;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + index * 0.09);
      gain.gain.exponentialRampToValueAtTime(0.13, ctx.currentTime + index * 0.09 + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.15 + index * 0.05);
      osc.connect(filter).connect(gain).connect(master);
      osc.start(ctx.currentTime + index * 0.09);
      osc.stop(stopAt);
    });
  } else if (type === "piano") {
    [262, 330, 392, 523].forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + index * 0.18);
      gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + index * 0.18 + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + index * 0.18 + 1.4);
      osc.connect(gain).connect(master);
      osc.start(ctx.currentTime + index * 0.18);
      osc.stop(stopAt);
    });
  } else {
    [0, 0.32, 0.64, 0.96, 1.28].forEach((offset) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "square";
      osc.frequency.setValueAtTime(95, ctx.currentTime + offset);
      osc.frequency.exponentialRampToValueAtTime(45, ctx.currentTime + offset + 0.13);
      gain.gain.setValueAtTime(0.22, ctx.currentTime + offset);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + offset + 0.18);
      osc.connect(gain).connect(master);
      osc.start(ctx.currentTime + offset);
      osc.stop(ctx.currentTime + offset + 0.22);
    });
  }
  setTimeout(() => ctx.close(), 2600);
}

function App() {
  const initialStatus = useMemo(() => ({
    guitar: { tuned: false, playCount: 0, stickCount: null },
    piano: { tuned: false, playCount: 0, stickCount: null },
    drum: { tuned: false, playCount: 0, stickCount: 0 },
  }), []);
  const [selectedId, setSelectedId] = useState(null);
  const [status, setStatus] = useState(initialStatus);
  const [showMethod, setShowMethod] = useState({});
  const [activity, setActivity] = useState({ id: null, mode: "idle" });
  const [log, setLog] = useState("악기를 선택한 뒤 연주 방법 또는 연주 버튼을 눌러보세요.");
  const [brokenStick, setBrokenStick] = useState(false);
  const [classMapFaded, setClassMapFaded] = useState(false);

  useEffect(() => {
    const onScroll = () => setClassMapFaded(window.scrollY > 130);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const updateStatus = (id, updater) => {
    setStatus((prev) => ({ ...prev, [id]: { ...prev[id], ...updater(prev[id]) } }));
  };

  const handleSelect = (instrument) => {
    setSelectedId(instrument.id);
    const current = status[instrument.id];
    setLog(methodLog(
      "information()",
      `악기명: ${instrument.name}\n브랜드: ${instrument.brand}\n조율 상태: ${current.tuned ? "조율 완료" : "조율 안 됨"}`
    ));
  };

  const handleMethod = (instrument) => {
    setShowMethod((prev) => ({ ...prev, [instrument.id]: !prev[instrument.id] }));
    setLog(methodLog("play()", instrument.playMethod()));
  };

  const handlePlay = async (instrument) => {
    const id = instrument.id;
    if (activity.mode !== "idle") return;

    const current = status[id];
    let needsTune = !current.tuned;
    let needsStick = id === "drum" && current.stickCount < 2;

    setLog(methodLog("canPlay()", `${instrument.name}의 조율 상태를 확인합니다.`));
    await wait(1000);

    if (needsTune) {
      setActivity({ id, mode: "tuning" });
      setLog(methodLog("tune()", instrument.tuneMessage()));
      await wait(1400);
      updateStatus(id, (prev) => ({ tuned: true, stickCount: id === "drum" && prev.stickCount < 2 ? 2 : prev.stickCount }));
    }

    if (needsStick) {
      setLog(methodLog("canPlay()", instrument.stickMessage(current.stickCount)));
      await wait(1000);
    }

    setActivity({ id, mode: "playing" });
    setLog(methodLog("play()", `${instrument.playMethod()}\n${instrument.name} 연주 중...`));
    playSynthSound(id);
    await wait(2600);

    let nextMethod = "play()";
    let nextMessage = `${instrument.name} 연주가 끝났습니다.`;
    setStatus((prev) => {
      const next = { ...prev, [id]: { ...prev[id] } };
      next[id].playCount += 1;
      if (next[id].playCount >= 5) {
        next[id].playCount = 0;
        next[id].tuned = false;
        nextMethod = "tune()";
        nextMessage = `${instrument.name}을 5번 연주해서 조율이 풀렸습니다.`;
        if (id === "drum") {
          next[id].stickCount = Math.max(0, next[id].stickCount - 1);
          nextMessage += " 스틱 1개가 부러졌습니다.";
          setBrokenStick(true);
          setTimeout(() => setBrokenStick(false), 900);
        }
      }
      return next;
    });
    setLog(methodLog(nextMethod, nextMessage));
    setActivity({ id: null, mode: "idle" });
  };

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-mark">♪</div>
        <div>
          <h1>Instrument</h1>
        </div>
      </header>

      <section className="hero">
        <p className="eyebrow">InstrumentADT → Instrument → Instances</p>
        <h2>악기를 선택하고, 객체마다 다른 연주 방식을 확인해보세요.</h2>
      </section>

      <InheritanceDiagram faded={classMapFaded} />

      <section className="cards-area">
        {instruments.map((instrument) => (
          <InstrumentCard
            key={instrument.id}
            instrument={instrument}
            selectedId={selectedId}
            onSelect={() => handleSelect(instrument)}
            status={status[instrument.id]}
            showMethod={!!showMethod[instrument.id]}
            toggleMethod={() => handleMethod(instrument)}
            onPlay={() => handlePlay(instrument)}
            activity={activity}
            brokenStick={instrument.id === "drum" && brokenStick}
          />
        ))}
      </section>

      <section className="log-panel">
        <span>Method Console</span>
        <p>{log}</p>
      </section>
    </main>
  );
}


function InheritanceDiagram({ faded }) {
  return (
    <section className={faded ? "inheritance-map faded" : "inheritance-map"} aria-label="OOP inheritance structure">
      <div className="uml-box abstract-box">
        <div className="uml-tag">&lt;&lt;abstract&gt;&gt;</div>
        <h3>InstrumentADT</h3>
        <div className="uml-grid">
          <div>
            <b>Fields</b>
            <p>+ name<br />+ brand<br />+ isTune</p>
          </div>
          <div>
            <b>Behaviors</b>
            <p>+ information()<br />+ play()<br />+ tune()</p>
          </div>
        </div>
      </div>

      <div className="inherit-arrow">↑</div>

      <div className="uml-box parent-box">
        <h3>Instrument</h3>
        <div className="uml-grid">
          <div>
            <b>Fields</b>
            <p>- __name : str<br />- __brand : str<br />- __isTune : bool</p>
          </div>
          <div>
            <b>Behaviors</b>
            <p>+ information()<br />+ play()<br />+ tune()<br />+ canPlay()</p>
          </div>
        </div>
      </div>

      <div className="card-connector" aria-hidden="true">
        <span />
        <i />
        <i />
        <i />
      </div>
      <p className="scroll-hint">아래 악기 카드는 Instrument를 상속받은 구현 객체입니다.</p>
    </section>
  );
}

function InstrumentCard({ instrument, selectedId, onSelect, status, showMethod, toggleMethod, onPlay, activity, brokenStick }) {
  const isSelected = selectedId === instrument.id;
  const hasSelection = selectedId !== null;
  const isTuning = activity.id === instrument.id && activity.mode === "tuning";
  const isPlaying = activity.id === instrument.id && activity.mode === "playing";
  const isBusy = activity.mode !== "idle";

  const className = [
    "instrument-card",
    isSelected ? "selected" : "",
    hasSelection && !isSelected ? "dimmed" : "",
    isPlaying ? "playing-card" : "",
  ].join(" ");

  return (
    <article className={className} onClick={onSelect}>
      <div className="status-row">
        <span className={status.tuned ? "badge tuned" : "badge untuned"}>{status.tuned ? "Tuned" : "Need Tune"}</span>
        <span className="badge count">{status.playCount}/5</span>
        {instrument.id === "drum" && <StickIndicator count={status.stickCount} brokenStick={brokenStick} />}
      </div>

      <div className="visual-stage">
        {instrument.id === "guitar" && <GuitarSvg tuning={isTuning} playing={isPlaying} />}
        {instrument.id === "piano" && <PianoSvg tuning={isTuning} playing={isPlaying} />}
        {instrument.id === "drum" && <DrumSvg tuning={isTuning} playing={isPlaying} stickCount={status.stickCount} brokenStick={brokenStick} />}
      </div>

      <div className={isSelected ? "card-details show" : "card-details"} onClick={(event) => event.stopPropagation()}>
        <h3>{instrument.name}</h3>
        <p>by {instrument.brand}</p>
        <div className="actions">
          <button onClick={toggleMethod}>연주 방법</button>
          <button className="primary" onClick={onPlay} disabled={isBusy}>
            {isTuning ? "조율 중..." : isPlaying ? "연주 중..." : "연주"}
          </button>
        </div>
        {showMethod && <p className="method-text"><b>play()</b><br />{instrument.playMethod()}</p>}
      </div>
    </article>
  );
}

function StickIndicator({ count, brokenStick }) {
  return (
    <span className="stick-indicator">
      {[0, 1].map((index) => <i key={index} className={index < count ? "stick-on" : "stick-off"} />)}
      {brokenStick && <b className="broken-text">crack!</b>}
    </span>
  );
}

function GuitarSvg({ tuning, playing }) {
  return (
    <div className={playing ? "guitar-photo-wrap guitar-photo-playing" : "guitar-photo-wrap"} aria-label="black Fender Jazzmaster electric guitar">
      <img className="guitar-photo" src="/jazzmaster.png" alt="Jazzmaster electric guitar" />

      {/* tuning: head machine sparkle overlay */}
      {tuning && (
        <div className="guitar-tuning-effects" aria-hidden="true">
          <span className="sparkle s1">✦</span>
          <span className="sparkle s2">✦</span>
          <span className="sparkle s3">✦</span>
          <span className="sparkle s4">✦</span>
          <span className="head-glow" />
        </div>
      )}

      {/* playing: pick + string vibration overlay */}
      <svg viewBox="0 0 240 680" className="guitar-photo-overlay" aria-hidden="true">
        <g className={playing ? "photo-strings vibrate" : "photo-strings"}>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <line key={i} x1={112 + i * 2.8} y1="120" x2={114 + i * 2.5} y2="590" />
          ))}
        </g>
        <path
          className={playing ? "photo-pick pick-play" : "photo-pick"}
          d="M148 450 C170 462, 167 489, 142 505 C127 482, 130 462, 148 450Z"
          fill="#2563eb"
        />
        {playing && (
          <g className="sound-lines">
            <path d="M42 438 C22 456, 22 486, 42 504" />
            <path d="M205 450 C226 469, 226 495, 205 515" />
          </g>
        )}
      </svg>
    </div>
  );
}

function PianoSvg({ tuning, playing }) {
  return (
    <svg viewBox="0 0 360 260" className="instrument-svg piano-svg" aria-label="Yamaha U1 upright piano">
      <rect x="80" y="58" width="200" height="126" rx="18" fill="#242424" />
      <rect x="98" y="76" width="164" height="48" rx="8" fill="#3a3a3a" />
      <rect x="98" y="130" width="164" height="48" rx="6" fill="#f8f5ed" />
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => <rect key={i} x={102 + i * 20} y={132} width="17" height={playing && [1,4,6].includes(i) ? 38 : 43} rx="3" className={playing && [1,4,6].includes(i) ? "key key-down" : "key"} />)}
      {[0, 1, 3, 4, 5].map((i) => <rect key={i} x={115 + i * 20} y={131} width="10" height="27" rx="2" fill="#171717" />)}
      <rect x="118" y="184" width="12" height="34" rx="4" fill="#242424" />
      <rect x="230" y="184" width="12" height="34" rx="4" fill="#242424" />
      <text x="180" y="106" textAnchor="middle" fill="#d7c29a" fontSize="16" fontWeight="700">YAMAHA</text>
      <g className={tuning ? "hammer hammer-show" : "hammer"}>
        <rect x="230" y="34" width="70" height="10" rx="5" fill="#8b5e34" />
        <rect x="252" y="39" width="9" height="55" rx="4" fill="#a47148" />
      </g>
      {playing && <g className="notes"><text x="284" y="68">♪</text><text x="65" y="100">♫</text></g>}
    </svg>
  );
}

function DrumSvg({ tuning, playing, stickCount, brokenStick }) {
  const activeStick1 = stickCount > 0;
  const activeStick2 = stickCount > 1;
  return (
    <svg viewBox="0 0 360 280" className="instrument-svg drum-svg" aria-label="Pearl Masters Maple Pure maple drum set">
      <defs>
        <linearGradient id="drumShell" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f5d39c" />
          <stop offset="55%" stopColor="#d99a4e" />
          <stop offset="100%" stopColor="#b8742f" />
        </linearGradient>
        <linearGradient id="drumHead" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fffdf7" />
          <stop offset="100%" stopColor="#f7ecd8" />
        </linearGradient>
        <linearGradient id="cymbalGold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f5d07a" />
          <stop offset="100%" stopColor="#b88935" />
        </linearGradient>
      </defs>

      {/* stands */}
      <g stroke="#8b8f98" strokeWidth="4.5" strokeLinecap="round">
        <line x1="76" y1="98" x2="58" y2="226" />
        <line x1="286" y1="96" x2="307" y2="228" />
        <line x1="58" y1="226" x2="35" y2="248" />
        <line x1="58" y1="226" x2="82" y2="250" />
        <line x1="307" y1="228" x2="282" y2="250" />
        <line x1="307" y1="228" x2="331" y2="250" />
      </g>

      {/* cymbals */}
      <ellipse className={playing ? "cymbal cymbal-hit" : "cymbal"} cx="76" cy="88" rx="48" ry="12" fill="url(#cymbalGold)" stroke="#9a6a2f" strokeWidth="4" />
      <ellipse className={playing ? "cymbal cymbal-hit delay" : "cymbal"} cx="286" cy="86" rx="48" ry="12" fill="url(#cymbalGold)" stroke="#9a6a2f" strokeWidth="4" />

      {/* bass drum */}
      <circle cx="180" cy="178" r="66" fill="url(#drumShell)" stroke="#8a5a2b" strokeWidth="5" />
      <circle cx="180" cy="178" r="52" fill="url(#drumHead)" stroke="#8a5a2b" strokeWidth="4" />
      <text x="180" y="184" textAnchor="middle" fill="#111827" fontSize="22" fontWeight="900" fontFamily="serif">Pearl</text>
      <g stroke="#8b8f98" strokeWidth="5" strokeLinecap="round">
        <line x1="135" y1="227" x2="118" y2="258" />
        <line x1="225" y1="227" x2="242" y2="258" />
      </g>

      {/* floor tom / snare */}
      <g>
        <path d="M56 152 L126 152 L121 219 L61 219 Z" fill="url(#drumShell)" stroke="#8a5a2b" strokeWidth="5" />
        <ellipse cx="91" cy="152" rx="36" ry="13" fill="url(#drumHead)" stroke="#8a5a2b" strokeWidth="5" />
        <line x1="68" y1="219" x2="56" y2="252" stroke="#8b8f98" strokeWidth="5" strokeLinecap="round" />
        <line x1="112" y1="219" x2="125" y2="252" stroke="#8b8f98" strokeWidth="5" strokeLinecap="round" />
      </g>
      <g>
        <path d="M238 157 L306 157 L300 213 L244 213 Z" fill="url(#drumShell)" stroke="#8a5a2b" strokeWidth="5" />
        <ellipse cx="272" cy="157" rx="35" ry="12" fill="url(#drumHead)" stroke="#8a5a2b" strokeWidth="5" />
        <line x1="252" y1="213" x2="238" y2="249" stroke="#8b8f98" strokeWidth="5" strokeLinecap="round" />
        <line x1="292" y1="213" x2="307" y2="249" stroke="#8b8f98" strokeWidth="5" strokeLinecap="round" />
      </g>

      {/* rack toms */}
      <g>
        <path d="M111 112 L165 112 L161 158 L115 158 Z" fill="url(#drumShell)" stroke="#8a5a2b" strokeWidth="5" />
        <ellipse cx="138" cy="112" rx="29" ry="10" fill="url(#drumHead)" stroke="#8a5a2b" strokeWidth="5" />
      </g>
      <g>
        <path d="M194 112 L249 112 L245 158 L198 158 Z" fill="url(#drumShell)" stroke="#8a5a2b" strokeWidth="5" />
        <ellipse cx="222" cy="112" rx="29" ry="10" fill="url(#drumHead)" stroke="#8a5a2b" strokeWidth="5" />
      </g>

      {/* chrome lugs */}
      {[70, 96, 250, 285].map((x, i) => <rect key={i} x={x} y="171" width="8" height="20" rx="3" fill="#f8fafc" stroke="#8b8f98" strokeWidth="3" />)}
      {[126, 151, 209, 235].map((x, i) => <rect key={i} x={x} y="124" width="7" height="16" rx="3" fill="#f8fafc" stroke="#8b8f98" strokeWidth="3" />)}

      {/* sticks */}
      <g className={playing ? "drumstick left-stick hit" : "drumstick left-stick"} opacity={activeStick1 ? 1 : .18}>
        <rect x="126" y="42" width="8" height="100" rx="4" fill="#8b5e34" />
      </g>
      <g className={playing ? "drumstick right-stick hit" : "drumstick right-stick"} opacity={activeStick2 ? 1 : .18}>
        <rect x="224" y="42" width="8" height="100" rx="4" fill="#8b5e34" />
      </g>

      {/* tuning key appears while tuning */}
      <g className={tuning ? "drum-key key-show" : "drum-key"}>
        <circle cx="302" cy="144" r="13" fill="#fef3c7" stroke="#b45309" strokeWidth="4" />
        <rect x="295" y="111" width="14" height="40" rx="6" fill="#f59e0b" stroke="#b45309" strokeWidth="3" />
      </g>
      {brokenStick && <path className="crack" d="M222 84l20 10-17 10 20 12" fill="none" stroke="#ef4444" strokeWidth="5" strokeLinecap="round" />}
    </svg>
  );
}

createRoot(document.getElementById("root")).render(<App />);
